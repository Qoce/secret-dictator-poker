import {getCardString} from './PokerUtils'
import {getTeamString} from './SDUtils'
import {Team} from '../Interface/Role'
import {useState} from 'react'
import dealer from '../Model/Poker'
import Game from '../Model/Game'
import Phase from '../Interface/Phase'
import Player from '../Interface/Player'
import Players from '../Model/Players'
import SDData from '../Model/SecretDictator'
import Settings from '../Model/Settings'

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
    {str + args.p.name + (args.p.connected ? "" : " (🔌)")}
  </div>
}

function TeamSquare(args: {p: Player, u: Player}){
  if(appState !== "inGame") return null
  return <div className = "square">
    {getTeamString({
      p: args.p,
      u: args.u,
      inEndgame: inEndgame()
    })}
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
  return appState === "inGame" && Game.getPhase() === Phase.poker
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
  if(appState !== "inGame") return null
  let n = args.p.role.influence
  if(inPoker()) n = args.p.curHand.stack
  else if(inEndgame()) n = args.p.bank
  
  return <div className = "cards">
    {(inEndgame() || args.u === args.p ||
    (args.u.bankVision.includes(args.p) && Settings.getString("investigationPower") !== "Role"))
    && n}
  </div>
}

function Cards(args: {p: Player, u: Player}){
  if(inPoker()){
    const show = args.p === args.u || (Settings.getString("investigationPower") === "Role + Bank + Cards" && 
      args.u.bankVision.includes(args.p))
    return <div className = "cards">
      {show ? args.p.curHand.hand.map(getCardString) : null}
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

function Government(args: {p: Player, chan?: Player, pres: Player}){
  if(appState !== "inGame") return null
  if(inPoker() || inEndgame()) return null
  let str = ""
  if(args.p === args.chan) str = "C"
  else if(args.p === args.pres) str = "P"
  return <div className = "square">
    {str}
  </div>
}

function inGovernment(){
  return [Phase.presBribe, Phase.chanBribe, Phase.president, Phase.chancellor,
    Phase.assassinate,Phase.investigate,Phase.peak,Phase.pickPres].includes(Game.getPhase())
}

function getBoldness(p : Player){
  if(inGovernment() && Settings.getString("bribeInfo") !== "Show True Government") return "normal"
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
  appState: "browsing" | "joining" | "inLobby" | "inGame" 
}

let appState = ""

export default function RenderPlayer(args : PlayerRenderArgs){
  appState = args.appState
  let p = args.p
  let selected = args.selected
  const [hovered, setHovered] = useState(false)
  const SDInfo = SDData()

  return <div className = "board-row" 
    style = {{fontWeight: getBoldness(p), 
      backgroundColor: bgc(args.u === args.p, hovered, selected), color: getTextColor(p)}}
    onMouseEnter = {() => {if(p.targetable && args.u.canAct) setHovered(true)}}
    onMouseLeave = {() => {if(p.targetable && args.u.canAct) setHovered(false)}}
    onClick = {() => {
      if(p.targetable && args.u.canAct){
        args.onSelected()
      }
      else if(Settings.getBool("debug")){
        args.setUser()
      }
    }}
  >
    <PokerPosition p = {p}/>
    <TeamSquare p = {args.p} u = {args.u}/>
    <Government p = {args.p} chan = {SDInfo.cCandidate} pres = {SDInfo.pCandidate}/>
    <Name p = {args.p}/>
    <AmtIn p = {args.p}/>
    <Stack p = {args.p} u = {args.u}/>
    <Cards p = {args.p} u = {args.u}/>
  </div>
}
