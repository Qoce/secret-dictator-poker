import ActionLog from './RenderActionLog'
import Game from '../Model/Game'
import Player from './RenderPlayer'
import Players from '../Model/Players'
import Phase from '../Interface/Phase'
import RenderPhase from "./RenderPhase"

import SDHeader from "./SDHeader"
import {useCallback, useState} from 'react'
import Actions from '../Model/Actions'


require("./RenderPoker")
require("./RenderSDBottom")

Game.setPhase(Phase.poker)

export default function SDP(){
  let sel : undefined | number
  const [selected,setSelected] = useState(sel)
  const [user,setUser] = useState(1)

  //forces the component to rerender when an action occurs
  const [turn,forceUpdate] = useState(0)

  Actions.onAction = useCallback(() => forceUpdate(turn + 1), [turn])

  //if(!RenderPhase[Game.getPhase()]) throw "error: phase " + Game.getPhase() + " cannot be rendered."
  //let RP = RenderPhase[Game.getPhase()] as (args: RenderPhaseArgs) => JSX.Element | undefined

  let renderPhase
  if(RenderPhase[Game.getPhase()]){
    let rr = RenderPhase[Game.getPhase()]
    if(rr){
      renderPhase = rr({p: user, t: selected})
    }
  }


  return (
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
        {renderPhase}
      </div>
    </div>
    <ActionLog />
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