import ActionLog from './RenderActionLog'
import Actions from '../Model/Actions'
import Game from '../Model/Game'
import getSDState from '../Model/SecretDictator'
import Lobby from '../Interface/Lobby'
import Notification from './RenderNotificationText'
import Phase from '../Interface/Phase'
import Player from './RenderPlayer'
import PlayerType from '../Interface/Player'
import Players from '../Model/Players'
import React, {useCallback, useEffect, useState} from 'react'
import RenderJoinLobby from "./RenderJoinLobby"
import RenderLobbyList from "./RenderLobbyList"
import RenderPhase from "./RenderPhase"
import {SettingsRender, LocalSettingsRender} from "./RenderSettings"
import SDLog from './RenderSDLog'
import SDHeader from "./RenderSDHeader"
import Settings from "../Model/Settings"
import settings from '../Model/Settings'

var WebFont = require('webfontloader')
require("./RenderPoker")
require("./RenderSDBottom")
require("./RenderPokerPlayer")
require("./RenderSDPlayer")

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
let updateRejoinLobbiesCallback : (l: [string, number, number][]) => void
let updateGameCallback : (l: Lobby) => void
let updateConnectedCallback : (l : boolean[]) => void

let refreshPointee : () => void

export function refresh(){
  refreshPointee()
}

socket.on('startGame', (l : Lobby) => startGameCallback(l))
socket.on('updateLobby', (l: Lobby) => updateLobbyCallback(l))
socket.on('updateLobbies', (l: string[]) => updateLobbiesCallback(l))
socket.on('updateRejoinLobbies', (l: [string, number, number][]) => 
  updateRejoinLobbiesCallback(l))
socket.on('updateGame', (l: Lobby) => updateGameCallback(l))
socket.on('updateConnected', (l: boolean[]) => updateConnectedCallback(l))

Actions.socket = socket

socket.on("updateTimer", (t: number[]) => {
  Players.players.map((p: PlayerType, i: number) => p.deadline = t[i])
  Actions.onAction()
})
export default function SDP(){
  let sel : undefined | number
  const [selected,setSelected] = useState(sel)
  const [user,setUser] = useState(1)
  const [lobbies, setLobbies] = useState(undefined as string[] | undefined)
  const [rejoinLobbies, setRejoinLobbies] = useState([] as [string, number, number][])
  const [appState, setAppState] = useState("rejoining" as 
    "rejoining" | "browsing" | "joining" | "inLobby" | "inGame")
  const [lobbyName, setLobbyName] = useState(undefined as string | undefined)
  const [rejoining, setRejoining] = useState(false as false | Lobby)
  const [username, setUsername] = useState("")

  useEffect (() => {
    WebFont.load({
      google: {
        families: ["UnifrakturCook:700"]
      }
    })
  }, [])

  function initFromLobby(l: Lobby, username: string){
    setLobbyName(l.name)
    settings.loadPreset(l.settings)
    Players.initFromNames(l.players)
    Actions.lobby = l.name
    setAppState("inLobby")
    setUsername(username)
    setUser(l.players.indexOf(username))
    forceUpdate(turn + 1)
  }

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
        initFromLobby(l, username)
        if(rejoin && l.inGame){
          setRejoining(l)
        }
      }
    })
  }

  function createOrJoinLobby(n: string, u: string, p: string) {
    if(lobbyName === undefined){
      socket.emit("createLobby", {name: n, username: u, password: p}, (l: Lobby) => {
        initFromLobby(l, u)
      })
    }
    else{
      joinLobby(lobbyName, u, p, rejoinLobbies.map(a => a[0]).includes(lobbyName))
    }
  }

  //Attempt to rejoin the lobby if we have stored data from a disconnect
  try{
    if(appState === "rejoining" && JSON.parse(window.sessionStorage.getItem("lobby") || "null")){
      //NOTE: use windowStorage instead of sessionStorage to keep data across tabs
      //(Need sessionStorage for any serious debugging)
      
      let u = JSON.parse(window.sessionStorage.getItem("name") || "null")
      let p = JSON.parse(window.sessionStorage.getItem("password") || "null")
      let n = JSON.parse(window.sessionStorage.getItem("lobby") || "null")
      console.log("Rejoining", n, u, p)
      if(u && (p || p === '') && n){
        joinLobby(n, u, p, true)
      }
      else{
        setAppState("browsing")
      }
    }
    else if(appState === "rejoining"){
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

  useEffect(() => {
    refreshPointee = () => forceUpdate(turn + 1)
  }, [turn])

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
    socket.emit('getLobbiesWithSpace', setRejoinLobbies)
  }

  startGameCallback = (l: Lobby) => {
    window.sessionStorage.setItem("lobby", JSON.stringify(l.name))
    window.sessionStorage.setItem("password", JSON.stringify(l.password))
    window.sessionStorage.setItem("name", JSON.stringify(l.players[user]))
    settings.loadPreset(l.settings)
    Players.initFromNames(l.players, l.connected)
    Actions.startingSeed = l.seed
    Players.reset()
    Actions.reset()
    setAppState("inGame")
    forceUpdate(turn + 1)
  }

  updateLobbyCallback = (l: Lobby) => {initFromLobby(l, username)}

  updateGameCallback = (l: Lobby) => {
    Actions.loadActions(l.actions)
    forceUpdate(turn + 1)
  }

  updateLobbiesCallback = setLobbies
  updateRejoinLobbiesCallback = setRejoinLobbies

  updateConnectedCallback = (c: boolean[]) => {
    if(c.length !== Players.players.length) return
    for(let i in c){
      Players.players[i].connected = c[i]
    }
    forceUpdate(turn + 1)
  }

  //Once we have rejoined a lobby, we need to simulate to catch up
  if(rejoining){
    startGameCallback(rejoining)
    updateGameCallback(rejoining)
    setRejoining(false)
  }

  const DEBUG_LOBBY = 'DEBUG'
  
  const restart_button = Game.getPhase() === Phase.endgame && appState === "inGame" &&
  <button style = {{marginTop: "15px"}}
  onClick = {() => {
    socket.emit('restartGame', lobbyName)
  }}>New Round</button>

  return (
  <div>
    <div className = "center">
      <div className = "wrapper">
        <LocalSettingsRender/>
        <div className = 'inLineRow'>
          {appState === "browsing" && <RenderLobbyList
            ls = {lobbies || []}
            rj = {rejoinLobbies}
            cr = {() => {
              setAppState("joining")
            }}
            join = {(n : string) => {
              setLobbyName(n)
              setAppState("joining")
            }}
            qj = {() => 
              socket.emit('getPlayersInLobby', DEBUG_LOBBY, (players: string[]) => {
                if(players.length > 0){
                  for(let i = 1; i <= 10; i++){
                    if(!players.includes("" + i)){
                      joinLobby(DEBUG_LOBBY, "" + i, "")
                      break
                    }
                  }
                }
                else{
                  createOrJoinLobby(DEBUG_LOBBY, "1", "")
                }
              })
            }
          />}
          {
            appState === "joining" && <RenderJoinLobby 
              oj = {createOrJoinLobby}
              s = {lobbyName}
            />
          }
          {appState === "inLobby" && <SettingsRender 
            onStart = {() => {
              socket.emit("startGame", lobbyName)
            }} 
            socket = {socket} 
            lobby = {lobbyName} 
            isHost = {Players.get(user).host}
            numPlayers = {Players.players.length}
          />}
          <Notification user = {user}/>
          {appState === "inGame" && <SDHeader user = {user}/>}
          <div className = "center">
            <div>
              {(appState === "inLobby" || appState === "inGame") && egSort().map(p => 
                <Player key = {p.name} p = {p} selected = {selected !== undefined && Players.get(selected) === p}
                onSelected = {() => setSelected(Players.players.indexOf(p))} u = {Players.get(user)}
                setUser = {() => setUser(Players.players.indexOf(p))}
                appState = {appState}/>
              )}
            </div>
            {restart_button}
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
        {appState === "inGame" && Settings.getBool("showActionLog") && <ActionLog p = {user}
          lobby = {lobbyName || ""}
          height = {Players.players.length * 40 + 271}
          socket = {socket}
        />}
        {appState === "inGame" &&
          <SDLog height = {Players.players.length * 40 + 271}/>
        }

      </div>
    </div>
  </div>
  )
}
