import ActionLog from './RenderActionLog'
import Actions from '../Model/Actions'
import Game from '../Model/Game'
import getSDState from '../Model/SecretDictator'
import Lobby from '../Interface/Lobby'
import Phase from '../Interface/Phase'
import Player from './RenderPlayer'
import Players from '../Model/Players'
import React, {useCallback, useState} from 'react'
import RenderJoinLobby from "./RenderJoinLobby"
import RenderLobbyList from "./RenderLobbyList"
import RenderPhase from "./RenderPhase"
import RenderSettings from "./RenderSettings"
import SDHeader from "./SDHeader"
import Settings from "../Model/Settings"
import settings from '../Model/Settings'

require("./RenderPoker")
require("./RenderSDBottom")
let {io} = require("socket.io-client")

const socket = io()

socket.on("connect_error", (err: any) => {
  console.log(`connect_error due to ${err.message}`);
});

//Sorts the array by bank if the phase is endgame
function egSort(){
  if(Game.getPhase() === Phase.endgame) return [...Players.players].sort((a, b) => b.bank - a.bank)
  return Players.players
}

let startGameCallback : (l: Lobby) => void
let updateLobbyCallback : (l: Lobby) => void
let updateLobbiesCallback : (l: string[]) => void
let updateGameCallback : (l: Lobby) => void
let updateConnectedCallback : (l : boolean[]) => void

socket.on('startGame', (l : Lobby) => startGameCallback(l))
socket.on('updateLobby', (l: Lobby) => updateLobbyCallback(l))
socket.on('updateLobbies', (l: string[]) => updateLobbiesCallback(l))
socket.on('updateGame', (l: Lobby) => updateGameCallback(l))
//socket.on('updateConnected', (l: boolean[]) => updateConnectedCallback(l))

Actions.socket = socket

export default function SDP(){
  let sel : undefined | number
  const [selected,setSelected] = useState(sel)
  const [user,setUser] = useState(1)
  const [lobbies, setLobbies] = useState(undefined as string[] | undefined)
  const [appState, setAppState] = useState("rejoining" as 
    "rejoining" | "browsing" | "joining" | "inLobby" | "inGame")
  const [lobbyName, setLobbyName] = useState(undefined as string | undefined)
  const [rejoining, setRejoining] = useState(false as false | Lobby)



  function joinLobby(name: string, username: string, password: string, rejoin = false){
    socket.emit("joinLobby", {name: name, username: username, password: password}, 
    (l: Lobby | string) => {
      if(typeof l === 'string'){
        if(rejoin){
          console.warn(l)
          setAppState("browsing")
        }
        else{
          alert(l)
        }
      }
      else{
        setLobbyName(l.name)
        Players.initFromNames(l.players)
        Actions.lobby = l.name
        setAppState("inLobby")
        setUser(l.players.indexOf(username))
        if(rejoin){
          setRejoining(l)
        }
      }
    })
  }

  //Attempt to rejoin the lobby if we have stored data from a disconnect
  try{
    if(appState == "rejoining" && JSON.parse(window.sessionStorage.getItem("lobby") || "null")){
      //NOTE: use windowStorage instead of sessionStorage to keep data across tabs
      //(Need sessionStorage for any serious debugging)
      
      let u = JSON.parse(window.sessionStorage.getItem("name") || "null")
      let p = JSON.parse(window.sessionStorage.getItem("password") || "null")
      let n = JSON.parse(window.sessionStorage.getItem("lobby") || "null")
      console.log(n, u, p)
      if(u && (p || p === '') && n){
        joinLobby(n, u, p, true)
      }
      else{
        setAppState("browsing")
      }
    }
    else if(appState == "rejoining"){
      setAppState("browsing")
    }
  }
  catch (e){
    console.error(e)
    window.sessionStorage.clear()
    setAppState("browsing")
  }

  //Removes selections from previous phases if they are not valid in the current one
  if(selected !== undefined && !Players.get(selected).targetable) setSelected(undefined)

  //forces the component to rerender when an action occurs
  const [turn,forceUpdate] = useState(0)

  Actions.onAction = useCallback(() => {forceUpdate(turn + 1)
    if(Settings.getBool("debug")) {
      let n = Players.next(user, p => p.canAct)
      if(n !== false) setUser(n)
    }
  }, [turn, user])

  //Bluer if liberals are winning, redder if fascists are winning
  document.body.style.backgroundColor = "hsl(" + getSDState().bg + ",100%,80%)"
  //if(!RenderPhase.get(Game.getPhase()]) throw "error: phase " + Game.getPhase() + " cannot be rendered."
  //let RP = RenderPhase.get(Game.getPhase()] as (args: RenderPhaseArgs) => JSX.Element | undefined

  //Gets the lobby name array from the server if we are browing
  if(appState === "browsing" && !lobbies){
    socket.emit('getLobbies', setLobbies)
  }

  startGameCallback = (l: Lobby) => {
    window.sessionStorage.setItem("lobby", JSON.stringify(l.name))
    window.sessionStorage.setItem("password", JSON.stringify(l.password))
    window.sessionStorage.setItem("name", JSON.stringify(l.players[user]))
    Players.initFromNames(l.players)
    Actions.startingSeed = l.seed
    Players.reset()
    Actions.reset()
    setAppState("inGame")
    forceUpdate(turn + 1)
  }

  updateLobbyCallback = (l: Lobby) => {
    settings.loadPreset(l.settings)
    Players.initFromNames(l.players)
    forceUpdate(turn + 1)
  }

  updateGameCallback = (l: Lobby) => {
    Actions.loadActions(l.actions)
    forceUpdate(turn + 1)
  }

  updateLobbiesCallback = setLobbies

  //Once we have rejoined a lobby, we need to simulate to catch up
  if(rejoining){
    startGameCallback(rejoining)
    updateGameCallback(rejoining)
    setRejoining(false)
  }

  return (
  <div className = "center">
  <div className = "wrapper">
    <div className = 'inLineRow'>
      {appState === "browsing" && <RenderLobbyList
        ls = {lobbies || []}
        cr = {() => {
          setAppState("joining")
        }}
        join = {(n : string) => {
          setLobbyName(n)
          setAppState("joining")
        }}
      />}
      {
        appState === "joining" && <RenderJoinLobby 
          s = {lobbyName}
          oj = {(n: string, u: string, p: string) => {
            if(lobbyName === undefined){
              socket.emit("createLobby", {name: n, username: u, password: p}, (l: Lobby) => {
                setLobbyName(l.name)
                setUser(0)
                Players.initFromNames(l.players)
                Actions.lobby = l.name
                setAppState("inLobby")
              })
            }
            else{
              joinLobby(lobbyName, u, p)
            }
          }}
        />
      }
      {appState === "inLobby" && <RenderSettings 
        onStart = {() => {
          socket.emit("startGame", lobbyName)
        }} 
        socket = {socket} 
        lobby = {lobbyName} 
        isHost = {Players.get(user).host}
        numPlayers = {Players.players.length}
      />}
      {appState === "inGame" && <SDHeader/>}
      <div className = "center">
        <div>
          {(appState === "inLobby" || appState === "inGame") && egSort().map(p => 
            <Player key = {p.name} p = {p} selected = {selected !== undefined && Players.get(selected) === p}
            onSelected = {() => setSelected(Players.players.indexOf(p))} u = {Players.get(user)}
            setUser = {() => setUser(Players.players.indexOf(p))}
            appState = {appState}/>
          )}
        </div>
      </div>
      <div className = "center">
        {appState === "inGame" && Array.from(RenderPhase.keys()).map(rp => {
          let r = RenderPhase.get(rp)
          if(r && Game.getPhase() === rp){
            return React.createElement(r, {p: user, t: selected, key: rp})
          }
          return null
        })}
      </div>
    </div>
    {appState === "inGame" && <ActionLog p = {user} height = {Players.players.length * 40 + 271}/>}
  </div>
  </div>)
}