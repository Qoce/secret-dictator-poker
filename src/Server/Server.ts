import express from 'express'
import path from 'path'
import http from 'http'
import {Server} from 'socket.io'
import Player from '../Interface/Player'
import ActionArgs from '../Interface/Action'
import Rng from '../Model/Rng'
import Lobby from '../Interface/Lobby'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {})

app.use(express.static(path.join(__dirname, '../../build')));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

interface LobbyInit{
  name: string,
  password: string,
}

const lobbies: Lobby[] = []

io.on('connection', (socket) => {
  console.log('client connected')
  socket.on('getLobbies', (_, callback) => {
    callback(lobbies.map(l => l.name))
  })
  socket.on('createLobby', (lobby : LobbyInit) => {
    const l : Lobby = {
      name: lobby.name,
      password: lobby.password,
      players: [],
      inGame: false,
      seed: Rng.nextInt(1e9),
      actions: [],
      settings: new Map<string, number | boolean | string>()
    }
    socket.join(l.name)
    lobbies.push(l)
  })
  socket.on('joinLobby', (lobby : LobbyInit, username: string, callback) => {
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
  socket.on('changeSetting', (lobby: string, setting: string, value: number | boolean | string, callback) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.settings.set(setting, value)
      socket.to(l.name).emit('updateLobby', l)
      callback(l)
    } 
  })
  socket.on('startGame', (lobby: string, callback) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.inGame = true
      Rng.randomize(l.players)
      socket.to(l.name).emit('startGame', l)
      callback(l)
    }
  })
  socket.on('action', (lobby: string, action: ActionArgs, callback) => {
    const l = lobbies.find(l => l.name === lobby)
    if(l){
      l.actions.push(action)
      socket.to(l.name).emit('updateGame', l)
      callback(l)
    } 
  })
})