import {sdlog, SDLogElement} from '../Model/SecretDictator'
import {getPhaseIcon} from "./RenderSDHeader"
import {colorPolicy} from '../Render/SDUtils'
import Settings, {gameMode} from "../Model/Settings"

export default function SDLog(args: {height: number}){
  if(!Settings.getBool("showSDLog") || gameMode() === "P") return null
  return <div className = 'scroller' style = {{height: args.height}}>
    {
      sdlog.log.map((a, _) => <RenderRow c = {a.c} p = {a.p} r = {a.r} v = {a.v} a = {a.a}/>).reverse()
    }
  </div>
}


function RenderRow(args: SDLogElement){
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
  return <div className = "board-row">
    {<div className = "sdlog-name">{args.p && args.p.name}</div>}
    {<div className = "sdlog-action">{args.a !== undefined ? getPhaseIcon(args.a, "") : "🢂"}</div>}
    {<div className = "sdlog-name">{args.c && args.c.name}</div>}
    {<div className = "sdlog-vote">{args.v && ("✔️" + ySum)}</div>}
    {<div className = "sdlog-vote">{args.v && ("❌" + nSum)}</div>}
    {<div className = "sdlog-action">{args.r !== undefined && 
      colorPolicy(args.r)}</div>}
  </div>
}
