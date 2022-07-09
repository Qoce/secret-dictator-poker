
import {Team, Role} from '../Interface/Role'
import Player from '../Interface/Player'
import Players from '../Model/Players'
import Settings from '../Model/Settings'
import SDData from '../Model/SecretDictator'

import {useState} from 'react'
import Actions from '../Model/Actions'
import dealer from '../Model/Poker'
import {getCardString} from './PokerUtils'
import Game from '../Model/Game'
import phase from '../Interface/Phase'
import { cp } from 'fs'

function getTeamString(args: {u: Player, p: Player}){
  let showHitler = args.u.role.team !== Team.liberal
  if(!args.u.role.vision.includes(args.p)) return ""
  let t = args.p.role.team 
  if(!showHitler && t === Team.dictator) t = Team.fascist 
  let color = t === Team.liberal ? "Blue" : "Red"
  return <span style = {{color: color}}>
    {["L","F","D"][t]} 
  </span>
}

//function getBonus(){
//  let ecoSize = this.props.ecoSize
//  if(this.props.hoveredTeam === 0){
//    return ecoSize
//  }
//  else if(this.props.hoveredTeam === 1 && this.props.president && this.props.isUser){
//    return Math.floor(.75 * ecoSize * this.props.numPlayers / 2)
//  }
//  else if(this.props.hoveredTeam === 1 && this.props.chancellor && this.props.isUser){
//    return Math.floor(.75 * ecoSize * this.props.numPlayers / 2)
//  }
//  else{
//    return 0
//  }
//}

//function embedPnl(n : number){
//  if(n > 0){
//    return embed("+" + n, "bonus", null, null, null, "green")
//  }
//  else{
//    return embed(n, "bonus", null, null, null, "red") 
//  }
//}

function bgc(isUser: boolean, hovered: boolean, selected: boolean){
  if(isUser) return "hsl(" + SDData().bg + ",80%,65%)"
  else if(hovered) return "hsl(" + SDData().bg + ",90%,57%)"
  else if(selected) return "hsl(" + SDData().bg + ",90%,57%)"
}

function Name(args: {p: Player}){
  return <div className = "name">
    {args.p.name}
  </div>
}

function TeamSquare(args: {p: Player, u: Player}){
  return <div className = "square">
    {getTeamString(args)}
  </div>
}
  
function getBlindString(p: Player){
  let d = Players.get(dealer().dealer)
  if(d === p) return "D"
  else{
    let nl = Players.nextLiving(d)
    if(nl !== false) d = Players.get(nl)
  }
  if(d === p) return "SB"
  else{
    let nl = Players.nextLiving(d)
    if(nl !== false) d = Players.get(nl)
  }
  if(d === p) return "BB"
}

function PokerPosition(args: {p: Player}){
  return <div className = "square">
    {getBlindString(args.p)}
  </div>
}

function Stack(args: {p: Player, u: Player}){
  if(args.p === args.u){
    return <div className = "cards">
      {args.p.curHand.stack}
    </div>
  }
  return null
}

function Cards(args: {p: Player, u: Player}){
  if(args.p === args.u){
    return <div className = "cards">
      {args.p.curHand.hand.map(getCardString)}
    </div>
  }
  return null
}

function AmtIn(args: {p: Player}){
  return <div className = "cards">
    {args.p.curHand.amtIn}
  </div>
}

function getDecoration(p: Player){
  if(p.bank === 0) return "line-through"
}

function getBoldness(p : Player){
  if(p.canAct) return "bold"
  return "normal"
}

function getTextColor(p: Player){
  if(p.bank > 0 && (Game.getPhase() !== phase.poker || !p.curHand.folded)) return "black"
  return "gray"
}

interface PlayerRenderArgs{
  p: Player
  u: Player
  selected: boolean
  setUser: () => void
  onSelected: () => void
}

export default function RenderPlayer(args : PlayerRenderArgs){
  let p = args.p
  let selected = args.selected
  const [hovered, setHovered] = useState(false)
  return <div className = "board-row" 
    style = {{textDecoration: getDecoration(p), fontWeight: getBoldness(p), 
      backgroundColor: bgc(args.u === args.p, hovered, selected), color: getTextColor(p)}}
    onMouseEnter = {() => {if(p.targetable && args.u.canAct) setHovered(true)}}
    onMouseLeave = {() => {if(p.targetable && args.u.canAct) setHovered(false)}}
    onClick = {() => {
      if(p.targetable && args.u.canAct){
        args.onSelected()
      }
      else if(Settings.debug){
        args.setUser()
      }
    }}
  >
    <PokerPosition p = {p}/>
    <TeamSquare p = {args.p} u = {args.u}/>
    <Name p = {args.p}/>
    <AmtIn p = {args.p}/>
    <Stack p = {args.p} u = {args.u}/>
    <Cards p = {args.p} u = {args.u}/>
  </div>
}
