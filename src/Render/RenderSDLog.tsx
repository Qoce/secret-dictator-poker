import {sdlog, SDLogElement} from '../Model/SecretDictator'
import {getPhaseIcon} from "./RenderSDHeader"
import {colorPolicy} from '../Render/SDUtils'
import Settings, {gameMode} from "../Model/Settings"
import {useState} from 'react'
import { columns, PlayerRenderArgs } from './RenderPlayer'
import Player from '../Interface/Player'
import { refresh } from './RenderGame'
import settings from '../Model/Settings'

export default function SDLog(args: {height: number}){
  if(!Settings.getBool("showSDLog") || gameMode() === "P") return null
  return <div className = 'scroller' style = {{height: args.height}}>
    {
      sdlog.log.map((a, _) => <RenderRow c = {a.c} p = {a.p} r = {a.r} v = {a.v} a = {a.a}/>).reverse()
    }
  </div>
}

function showVoting(){
  return settings.getString("showVoting")
}

let hoveredVotes : Map<Player, number> | undefined

function RenderRow(args: SDLogElement){
  const [hovered, setHovered] = useState(false)

  let ySum = 0
  let nSum = 0
  if(args.v){
    let vItr = args.v.values()
    let n = vItr.next().value
    while(n !== undefined){
      if(n > 0) ySum += n
      else nSum -= n 
      n = vItr.next().value
    }
  }
  let td = hovered ? "underline" : "none"
  return <div className = "board-row"
    onMouseEnter = {() => {
      if(showVoting() === "Anonymous") return
      setHovered(true)
      hoveredVotes = args.v
      refresh()
    }}
    onMouseLeave = {() => {
      if(showVoting() === "Anonymous") return
      setHovered(false)
      hoveredVotes = undefined
      refresh()
    }}>
    {<div className = "sdlog-name" style ={{textDecoration: td}}>{args.p && args.p.name}</div>}
    {<div className = "sdlog-action" style ={{textDecoration: td}}>{args.a !== undefined ? getPhaseIcon(args.a, "") : "🢂"}</div>}
    {<div className = "sdlog-name" style ={{textDecoration: td}}>{args.c && args.c.name}</div>}
    {<div className = "sdlog-vote" style ={{textDecoration: td}}>{args.v && ("✔️" + ySum)}</div>}
    {<div className = "sdlog-vote" style ={{textDecoration: td}}>{args.v && ("❌" + nSum)}</div>}
    {<div className = "sdlog-action" style ={{textDecoration: td}}>{args.r !== undefined && 
      colorPolicy(args.r)}</div>}
  </div>
}

function RenderPlayerVotes(args: PlayerRenderArgs){
  if(!hoveredVotes) return null
  let n = hoveredVotes.get(args.p)
  if(!n) return null
  let str = ""
  if(n > 0) str = "✔️"
  else str = "❌"
  if(showVoting() === "Value") {
    str += " " + Math.abs(n)
    return <div className = "cards">{str}</div>
  }
  return <div className = "square">{str}</div>
}

columns.push({idx: -15, comp: RenderPlayerVotes})
