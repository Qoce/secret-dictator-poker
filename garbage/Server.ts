interface ActionArgs{
  p: number,
  t?: number,
  v?: number
}

interface Lobby{
  name: string,
  password: string,
  players: string[],
  inGame: boolean,
  seed: number,
  actions: ActionArgs[],
  settings: Map<string, number | boolean | string>
}

const { Server } = require("socket.io");
const express = require('express');
const path = require('path');
const http = require('http');

const app = express()
const server = http.createServer(app)
const io = new Server(server, {})

app.use(express.static(path.join(__dirname, '../../build')));
app.get('/', (_ : any, res :any) => {
  res.sendFile(__dirname + '/index.html');
});

interface LobbyInit{
  name: string,
  password: string,
  username: string
}

const lobbies: Lobby[] = []

io.on('connection', (socket : any) => {
  console.log('client connected')
  socket.on('getLobbies', (callback : any) => {
    callback(lobbies.filter(l => !l.inGame).map(l => l.name))
  })
  socket.on('createLobby', (lobby : LobbyInit, callback : any) => {
    const l : Lobby = {
      name: lobby.name,
      password: lobby.password,
      players: [lobby.username],
      inGame: false,
      seed: Math.floor(Math.random() * 1000000),
      actions: [],
      settings: new Map<string, number | boolean | string>()
    }
    socket.join(l.name)
    lobbies.push(l)
    callback(l)
  })
  socket.on('joinLobby', (lobby : LobbyInit, username: string, callback : any) => {
    const l = lobbies.find(l => l.name === lobby.name)
    if(l && l.password === lobby.password){
      if(l.players.indexOf(username) === -1){
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
  socket.on('changeSetting', (lobby: string, setting: string, value: number | boolean | string) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.settings.set(setting, value)
      socket.to(l.name).emit('updateLobby', l)
    } 
  })
  socket.on('startGame', (lobby: string, callback : any) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.inGame = true
    //  Rng.randomize(l.players)
      socket.to(l.name).emit('startGame', l)
      callback(l)
    }
  })
  socket.on('action', (lobby: string, action: ActionArgs) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.push(action)
      socket.to(l.name).emit('updateGame', l)
    } 
  })
})