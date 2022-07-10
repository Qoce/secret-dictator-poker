import { cp } from 'fs'
import {getCardString} from './PokerUtils'
import {Team, Role} from '../Interface/Role'
import {useState} from 'react'
import Actions from '../Model/Actions'
import dealer from '../Model/Poker'
import Game from '../Model/Game'
import Phase from '../Interface/Phase'
import Player from '../Interface/Player'
import Players from '../Model/Players'
import SDData from '../Model/SecretDictator'
import Settings from '../Model/Settings'

function getTeamString(args: {u: Player, p: Player}){
  let showHitler = args.u.role.team !== Team.liberal || inEndgame()
  if(!args.u.role.vision.includes(args.p) && !inEndgame()) return ""
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
  if(isUser) return "hsl(" + SDData().bg + ",100%,40%)"
  else if(hovered) return "hsl(" + SDData().bg + ",80%,60%)"
  else if(selected) return "hsl(" + SDData().bg + ",80%,60%)"
}

function Name(args: {p: Player}){
  let str = args.p.bank === 0 ? "💀 " : ""
  return <div className = "name">
    {str + args.p.name}
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

function inPoker(){
  return Game.getPhase() === Phase.poker
}

function inEndgame(){
  return Game.getPhase() === Phase.endgame
}

function PokerPosition(args: {p: Player}){
  if(!inPoker()) return null
  return <div className = "square">
    {getBlindString(args.p)}
  </div>
}

function Stack(args: {p: Player, u: Player}){
  let n = args.p.role.influence
  if(inPoker()) n = args.p.curHand.stack
  else if(inEndgame()) n = args.p.bank
  return <div className = "cards">
    {(args.p === args.u || inEndgame()) && n}
  </div>
}

function Cards(args: {p: Player, u: Player}){
  if(args.p === args.u && inPoker()){
    return <div className = "cards">
      {args.p.curHand.hand.map(getCardString)}
    </div>
  }
  return null
}

function AmtIn(args: {p: Player}){
  if(!inPoker()) return null
  return <div className = "cards">
    {args.p.curHand.amtIn}
  </div>
}


function getBoldness(p : Player){
  if(p.canAct) return "bold"
  return "normal"
}

function getTextColor(p: Player){
  if(p.bank === 0) return "grey"
  if(inPoker() && !p.curHand.folded) return "black"
  if(inPoker()) return "grey"
  if(Players.players.filter(p => p.targetable).length > 0){
    if(!p.targetable && !p.canAct) return "grey"
  }
  return "black"
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
    style = {{fontWeight: getBoldness(p), 
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
