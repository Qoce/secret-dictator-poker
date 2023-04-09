import {classWidths} from '../Utils/CSSRef'
import React, {useState, useEffect} from 'react'
import Game from '../Model/Game'
import Phase from '../Interface/Phase'
import Player from '../Interface/Player'
import Players from '../Model/Players'
import SDData from '../Model/SecretDictator'
import Actions from '../Model/Actions'
import Settings, {gameMode} from '../Model/Settings'

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
  if(isUser && Settings.getBool("debug")) return "hsl(" + SDData().bg + ",100%,40%)"
  else if(hovered) return "hsl(" + SDData().bg + ",80%,60%)"
  else if(selected) return "hsl(" + SDData().bg + ",80%,60%)"
}

function Name(args: {p: Player}){
  let str = args.p.dead ? "💀 " : ""
  return <div className = "name">
    {str + args.p.name + (args.p.connected ? "" : " (🔌)")}
  </div>
}

function inPoker(args: PlayerRenderArgs){
  return args.appState === "inGame" && Game.getPhase() === Phase.poker
}

function inGovernment(){
  return [Phase.presBribe, Phase.chanBribe, Phase.president, Phase.chancellor,
    Phase.assassinate,Phase.investigate,Phase.peak,Phase.pickPres].includes(Game.getPhase())
}

function getBoldness(p : Player){
  if(inGovernment() && Settings.getString("bribeInfo") !== "Show True Government"
    && gameMode() === "SDP") return "normal"
  if(p.canAct) return "bold"
  return "normal"
}

function getTextColor(args: PlayerRenderArgs){
  let color = getTextColorArial(args)
  if(Settings.getBool("font") && getBoldness(args.p) === "bold") return "rgb(139,0,0)"
  return color
}

//Text color if we are using default font. In this case, we make the active player bold.
function getTextColorArial(args: PlayerRenderArgs){
  if(args.p.dead) return "grey"
  if(inPoker(args) && !args.p.curHand.folded) return "black"
  if(inPoker(args)) return "grey"
  if(Players.players.filter(p => p.targetable).length > 0){
    if(!args.p.targetable && !args.p.canAct) return "grey"
  }
  return "black"
}

//Display a number if the player has bank vision on the user
export function BankVision(args: PlayerRenderArgs, n: number){
  if(args.appState !== "inGame") return null
  return <div className = "cards cleanFont">
    {((args.u.bankVision.includes(args.p) && Settings.getString("investigationPower") !== "Role")
    || Game.getPhase() === Phase.endgame || args.u === args.p)
    && n}
  </div>
}

function Bank(args: PlayerRenderArgs){
  if(args.appState !== "inGame") return null
  if(gameMode() === "SD") return null
  if(Game.getPhase() === Phase.endgame) return BankVision(args, args.p.bank)
  return null
}

function Timer(args: PlayerRenderArgs){
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      if(args.p.deadline > Date.now()){
        setSeconds(args.p.deadline - Date.now())
      }
      else if(args.p.deadline > 0 && args.p === args.u){
        Actions.fire({p: Players.players.indexOf(args.p)})
        setSeconds(0)
      }
    }, 10)
    return () => clearInterval(interval)
  }, [args.p, args.u])
  if(args.appState !== "inGame") return null
  if(!Game.getPhaseTimer()) return null
  if(args.p.deadline === 0 || (getBoldness(args.p) === 'normal'
    && args.p !== args.u)) {
    return <div className = "cards"></div>
  }
  return <div className = "cards" style = {{'textAlign': 'left'}}>
    {"⏰" + Math.floor(seconds / 1000)}
  </div>
}

export interface PlayerRenderArgs{
  p: Player
  u: Player
  selected: boolean
  setUser: () => void
  onSelected: () => void
  appState: "browsing" | "joining" | "inLobby" | "inGame" 
}

export let columns : {idx: number, comp : React.FunctionComponent<PlayerRenderArgs>,
  width: number, title: string}[] = []

columns.push({idx: 0, comp: Name, width: classWidths['name'], title: "Name"})
columns.push({idx: 5, comp: Bank, width: classWidths['cards'], title: "Bank"})
columns.push({idx: -10, comp: Timer, width: classWidths['cards'], title: "Timer"})

function getMargin(args: PlayerRenderArgs){
  let leftWidth = 0
  let rightWidth = 0
  for(let c of columns){
    if(c.comp(args) === null) continue
    if(c.idx < 0) leftWidth += c.width
    else if(c.idx > 0) rightWidth += c.width
  }
  return rightWidth - leftWidth
}

export default function RenderPlayer(args : PlayerRenderArgs){
  let p = args.p
  let selected = args.selected
  const [hovered, setHovered] = useState(false)
  return <div className = "board-row" 
    style = {{fontWeight: getBoldness(p), marginLeft: getMargin(args)+ "px",
      backgroundColor: bgc(args.u === args.p, hovered, selected), color: getTextColor(args)}}
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
      {columns.sort((a, b) => a.idx - b.idx).map((c, _) => React.createElement(
        c.comp, args
      ))}
    </div>
}

export function PlayerTitle(args: PlayerRenderArgs){
  return <div className = "board-row" 
    style =
    {{marginLeft: getMargin(args)+ "px", marginTop: "20px"}}>
    {
      columns.map(c => c.comp(args) && <div className = "name" style = {{
        width: c.width + "px", textAlign: "center"
      }}>
        {c.title}
      </div>)
    }
  </div>
}