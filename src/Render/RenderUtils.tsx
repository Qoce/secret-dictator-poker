
import {RenderPhaseArgs} from "./RenderPhase"
import Players from "../Model/Players"
import Actions from "../Model/Actions"

interface CRArgs extends RenderPhaseArgs{
  title: string
}

export function Confirm(args: CRArgs){
  //needs to have the same state as other phases
  let target = args.t
  let onClick : () => void = () => {return}
  if(target !== undefined){
    let targetable = Players.get(target).targetable
    onClick = () => {if(targetable && Players.get(args.p).canAct) Actions.fire({
      p: args.p,
      t: args.t
    })}
  }
  
  return <button className = "button" onClick = {onClick} disabled = {target === undefined}>
    {args.title}
  </button>
  
}

export function confirmRenderer(title: string){
  return (args: RenderPhaseArgs) => {
    if(!Players.get(args.p).canAct) return null
    return <Confirm title = {title} p = {args.p} t = {args.t}/>
  }
}

export function confirmOrPassRenderer(title: string){
  return (args: RenderPhaseArgs) => {
    if(!Players.get(args.p).canAct) return null
    return <div>
      <Confirm title = {title} p = {args.p} t = {args.t}/>
      <button className = "button" onClick = {() => Actions.fire({p: args.p})}>
        Pass
      </button>
    </div>
  }
}

interface BDArgs extends RenderPhaseArgs{
  title: () => string
}

export function BooleanDecision(args: BDArgs){
  function decision(accept: boolean){
    return () => Actions.fire({
      p: args.p,
      v: accept ? 1 : 0
    })
  }
  if(!Players.get(args.p).canAct) return null
  return <div className = "center">
    <div>
      {args.title()}
    </div>
    <button className = "button" onClick = {decision(true)}>
      {"Accept"}
    </button>
    <button className = "button" onClick = {decision(false)}>
      {"Decline"}
    </button>
  </div>
}
