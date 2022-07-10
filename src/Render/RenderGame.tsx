import ActionLog from './RenderActionLog'
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


require("./RenderPoker")
require("./RenderSDBottom")

Players.reset()
Actions.reset()



export default function SDP(){
  let sel : undefined | number
  const [selected,setSelected] = useState(sel)
  const [user,setUser] = useState(1)
  if(selected && !Players.get(selected).targetable) setSelected(undefined)
  //forces the component to rerender when an action occurs
  const [turn,forceUpdate] = useState(0)

  Actions.onAction = useCallback(() => {forceUpdate(turn + 1)
    if(Settings.debug) {
      let n = Players.next(user, p => p.canAct)
      if(n !== false) setUser(n)
    }
  }, [turn, user])

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
      <SDHeader/>
      <div className = "center">
        <div>
          {Players.players.map(p => 
            <Player p = {p} selected = {selected !== undefined && Players.get(selected) === p}
            onSelected = {() => setSelected(Players.players.indexOf(p))} u = {Players.get(user)}
            setUser = {() => setUser(Players.players.indexOf(p))}/>
          )}
        </div>
      </div>
      <div className = "center">
        {Array.from(RenderPhase.keys()).map(rp => {
          let r = RenderPhase.get(rp)
          if(r && Game.getPhase() === rp){
            return React.createElement(r, {p: user, t: selected})
          }
        })}
      </div>
    </div>
    <ActionLog p = {user}/>
  </div>
  </div>)
}

//{Players.players.map(p => 
//  <Player p = {p} selected = {selected !== undefined && Players.get(selected) === p}
//    onSelected = {() => setSelected(Players.players.indexOf(p))} u = {u}/>
//)}
//{RP({
//  p: Players.players.indexOf(u),
//  t: selected
//})}