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

io.on('connection', (socket) => {
  function updateLobbies(){
    io.to("SelectingLobbies").emit("updateLobbies", openLobbies())
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
  
  socket.on('getLobbies', (callback) => {
    callback(openLobbies())
  })
  socket.on('createLobby', (lobby, callback) => {
    while (lobbies.find(l => l.name === lobby.name)) lobby.name += "."
    const l = {
      name: lobby.name,
      password: lobby.password,
      players: [lobby.username],
      connected: [true],
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
      if(idx === -1 || !l.connected[idx]){
        if(l.players.length < 10){
          lName = lobby.name
          uName = lobby.username
          //A new player joining. Skip these steps for reconnecting
          socket.leave('SelectingLobbies')
          socket.join(l.name)
          if(idx === -1){
            l.players.push(lobby.username)
            l.connected.push(true)
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
      else{
        callback("Username already taken")
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
    //  callback(l)
    }
  })
  socket.on('action', (lobby, action) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.push(action)
      io.sockets.in(l.name).emit('updateGame', l)
    } 
  })
  socket.on('rollback', (lobby, n) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.splice(n, l.actions.length - n)
      io.sockets.in(l.name).emit('updateGame', l)
    }
  })
})

console.log("process.env.PORT " + process.env.PORT)

server.listen(process.env.PORT || 8080, () => {
  console.log('listening on *:8080');
});