const { Server } = require("socket.io");
const express = require('express');
const path = require('path');
const http = require('http');

const app = express()
const server = http.createServer(app)
const io = new Server(server, {})

app.use(express.static(path.join(__dirname, '../../build')));
app.get('/', (_ , res ) => {
  res.sendFile(__dirname + '/index.html');
});



let lobbies = []
let nConnected = 0

function openLobbies(){
  return lobbies.filter(l => !l.inGame && l.players.length < 10).map(l => l.name)
}

function lobbiesWithSpace(){
  return lobbies.map(l => {
    let numConnected = l.connected.filter(c => c).length
    return l.inGame && numConnected < l.players.length && [l.name, numConnected, l.players.length]
  }).filter(a => a)
}

io.on('connection', (socket) => {
  function updateLobbies(){
    io.to("SelectingLobbies").emit("updateLobbies", openLobbies())
    io.to("SelectingLobbies").emit("updateRejoinLobbies", lobbiesWithSpace())
  }
  function exitLobby(){
    if(lName){
      const l = lobbies.find(l => l.name === lName)
      if(l){
        //Show disconnect if in game
        if(l.inGame){
          l.connected[l.players.indexOf(uName)] = false
          io.to(lName).emit('updateConnected', l.connected)
        }
        //Remove player if not in game
        else{
          l.players = l.players.filter(u => u !== uName)
          l.connected.pop()
        }
        //Delete lobby if everyone is disconnected, even if in game
        if(l.connected.every(c => !c)){
          lobbies = lobbies.filter(l => l.name !== lName)
          updateLobbies()
        }
        else if(!l.inGame){
          console.log(l)
          io.to(lName).emit('updateLobby', l)
        }
      }
    }
    socket.join('SelectingLobbies')
  }

  socket.join('SelectingLobbies') //Room to view updates to lobby list
  let lName = null
  let uName = null

  console.log('client connected ' + ++nConnected)
  socket.on('disconnect', () => {
    console.log('client disconnected ' + --nConnected)
    exitLobby()
  })
  socket.on('getPlayersInLobby', (lobby, callback) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l !== undefined) callback(l.players)
    else callback([]) 
  })
  socket.on('getLobbies', (callback) => {
    callback(openLobbies())
  })
  socket.on('getLobbiesWithSpace', (callback) => {
    callback(lobbiesWithSpace())
  })
  socket.on('createLobby', (lobby, callback) => {
    while (lobbies.find(l => l.name === lobby.name)) lobby.name += "."
    const l = {
      name: lobby.name,
      password: lobby.password,
      players: [lobby.username],
      connected: [true],
      //[a,b], where a is the id and b is the timestamp of timer start
      timers: [null],
      inGame: false,
      seed: Math.floor(Math.random() * 1000000),
      actions: [],
      settings: []
    }
    lName = lobby.name
    uName = lobby.username
    socket.leave('SelectingLobbies')
    socket.join(l.name)
    lobbies.push(l)
    updateLobbies()
    callback(l)
  })
  socket.on('joinLobby', (lobby, callback) => {
    const l = lobbies.find(l => l.name === lobby.name)
    if(l && l.password === lobby.password){
      let idx = l.players.indexOf(lobby.username)
      if((idx === -1 && !l.inGame) || (idx >= 0 && !l.connected[idx])){
        if(l.players.length < 10){
          lName = lobby.name
          uName = lobby.username
          //A new player joining. Skip these steps for reconnecting
          socket.leave('SelectingLobbies')
          socket.join(l.name)
          if(idx === -1){
            l.players.push(lobby.username)
            l.connected.push(true)
            l.timers.push(null)
            socket.to(l.name).emit('updateLobby', l)
            if(l.players.length == 10){
              updateLobbies()
            }
          }
          else{
            l.connected[idx] = true
            io.to(l.name).emit('updateConnected', l.connected)
          }
          callback(l)
        }
        else{
          callback("Lobby is full")
        }
      }
      else if(idx !== -1){
        callback("Username already taken")
      }
      else{
        callback("Lobby has already started")
      }
    }
    else{
      callback("Incorrect password")
    }
  })
  socket.on('changeSetting', (lobby, setting, value) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      let s = l.settings.find(s => s[0] === setting)
      if(s) s[1] = value
      else l.settings.push([setting, value])
      io.sockets.in(l.name).emit('updateLobby', l)
    } 
  })
  socket.on('startGame', (lobby) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.inGame = true
      //TODO, randomize player order?
      io.sockets.in(l.name).emit('startGame', l)
    }
  })
  socket.on('action', (lobby, action) => {
    console.log(action)
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.push(action)
      io.sockets.in(l.name).emit('updateGame', l)
    } 
  })
  socket.on('setTimer', (lobby, player, timer, timerIdx) => {
    const l = lobbies.find(l => l.name === lobby)
    let updatedAny = false
    if(l){
      let oldT = l.timers[player]
      if(!oldT || oldT[0] < timerIdx) {
        l.timers[player]= [timerIdx, timer]
        updatedAny = true
      }
    }
    if(updatedAny) io.sockets.in(l.name).emit('updateTimer', l.timers.map(x => x ? x[1] : null))
  })
  socket.on('getTimers', (lobby, callback) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      callback(l.timers.map(x => x ? x[1] : null))
    }
  })
  socket.on('rollback', (lobby, n) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.splice(n, l.actions.length - n)
      io.sockets.in(l.name).emit('updateGame', l)
    }
  })
  socket.on('restartGame', (lobby) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.inGame = false
      l.actions = []
      l.seed = Math.floor(Math.random() * 1000000)
      //Kick disconnected players
      let newPlayers = []
      for(let i = 0; i < l.players.length; i++){
        if(l.connected[i]){
          newPlayers.push(l.players[i])
        }
      }
      l.players = newPlayers
      l.connected = []
      for(_ in l.players){
        l.connected.push(true)
      }
      io.sockets.in(l.name).emit('updateLobby', l)
      updateLobbies()
    }
  })
})

console.log("process.env.PORT " + process.env.PORT)

server.listen(process.env.PORT || 8080, () => {
  console.log('listening on *:8080');
});
