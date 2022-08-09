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



const lobbies = []
let nConnected = 0

io.on('connection', (socket) => {
  console.log('client connected ' + ++nConnected)
  socket.on('disconnect', () => {
    console.log('client disconnected ' + --nConnected)
  })
  
  socket.on('getLobbies', (callback) => {
    callback(lobbies.filter(l => !l.inGame).map(l => l.name))
  })
  socket.on('createLobby', (lobby, callback) => {
    const l = {
      name: lobby.name,
      password: lobby.password,
      players: [lobby.username],
      inGame: false,
      seed: Math.floor(Math.random() * 1000000),
      actions: [],
      settings: []
    }
    socket.join(l.name)
    lobbies.push(l)
    callback(l)
  })
  socket.on('joinLobby', (lobby, callback) => {
    const l = lobbies.find(l => l.name === lobby.name)
    if(l && l.password === lobby.password){
      if(l.players.indexOf(lobby.username) === -1){
        l.players.push(lobby.username)
        socket.join(l.name)
        socket.to(l.name).emit('updateLobby', l)
        callback(l)
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
})

console.log(process.env.PORT)

server.listen(process.env.PORT || 8080, () => {
  console.log('listening on *:8080');
});