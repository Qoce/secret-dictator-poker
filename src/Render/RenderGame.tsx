import ActionLog from './RenderActionLog'
import app from '../Model/Application'
import Game from '../Model/Game'
import Player from './RenderPlayer'
import Players from '../Model/Players'
import Phase from '../Interface/Phase'
import RenderPhase from "./RenderPhase"
import {RenderPhaseArgs} from "./RenderPhase"
import Settings from "../Model/Settings"

import SDHeader from "./SDHeader"
import React, {useCallback, useState} from 'react'
import Actions from '../Model/Actions'
import { keyboard } from '@testing-library/user-event/dist/keyboard'
import getSDState from '../Model/SecretDictator'
import RenderSettings from "./RenderSettings"


require("./RenderPoker")
require("./RenderSDBottom")

//Sorts the array by bank if the phase is endgame
function egSort(){
  if(Game.getPhase() === Phase.endgame) return [...Players.players].sort((a, b) => b.bank - a.bank)
  return Players.players
}


export default function SDP(){
  let sel : undefined | number
  const [selected,setSelected] = useState(sel)
  const [user,setUser] = useState(1)
  if(selected && !Players.get(selected).targetable) setSelected(undefined)
  //forces the component to rerender when an action occurs
  const [turn,forceUpdate] = useState(0)

  Actions.onAction = useCallback(() => {forceUpdate(turn + 1)
    if(Settings.getBool("debug")) {
      let n = Players.next(user, p => p.canAct)
      if(n !== false) setUser(n)
    }
  }, [turn, user])

  document.body.style.backgroundColor = "hsl(" + getSDState().bg + ",100%,80%)"
  //if(!RenderPhase.get(Game.getPhase()]) throw "error: phase " + Game.getPhase() + " cannot be rendered."
  //let RP = RenderPhase.get(Game.getPhase()] as (args: RenderPhaseArgs) => JSX.Element | undefined

  let renderPhase
  if(RenderPhase.get(Game.getPhase())){
    let rr = RenderPhase.get(Game.getPhase())
    if(rr){
      renderPhase = rr({p: user, t: selected})
    }
  }

  return (
  <div className = "center">
  <div className = "wrapper">
    <div className = 'inLineRow'>
      {app.status === "inLobby" && <RenderSettings onStart = {() => {
        app.status = "inGame"
        Players.reset()
        Actions.reset()
        forceUpdate(turn + 1)
      }}/>}
      {app.status === "inGame" && <SDHeader/>}
      <div className = "center">
        <div>
          {app.status !== "browsing" && egSort().map(p => 
            <Player key = {p.name} p = {p} selected = {selected !== undefined && Players.get(selected) === p}
            onSelected = {() => setSelected(Players.players.indexOf(p))} u = {Players.get(user)}
            setUser = {() => setUser(Players.players.indexOf(p))}/>
          )}
        </div>
      </div>
      <div className = "center">
        {app.status === "inGame" && Array.from(RenderPhase.keys()).map(rp => {
          let r = RenderPhase.get(rp)
          if(r && Game.getPhase() === rp){
            return React.createElement(r, {p: user, t: selected, key: rp})
          }
        })}
      </div>
    </div>
    {app.status === "inGame" && <ActionLog p = {user} height = {Players.players.length * 40 + 271}/>}
  </div>
  </div>)
}