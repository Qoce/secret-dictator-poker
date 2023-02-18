import Game from "../Model/Game"
import Phase from "../Interface/Phase"
import {PlayerRenderArgs} from "./RenderPlayer"
import {getTeamString} from "./SDUtils"
import SDState, {inSD} from "../Model/SecretDictator"
import {columns, BankVision} from "./RenderPlayer"

function TeamSquare(args: PlayerRenderArgs){
  if(args.appState !== "inGame") return null
  return <div className = "square">
    {getTeamString({
      p: args.p,
      u: args.u,
      inEndgame: Game.getPhase() === Phase.endgame
    })}
  </div>
}

function Influence(args: PlayerRenderArgs){
  if(inSD()){
    return BankVision(args, args.p.role.influence)
  }
  return null
}

function Government(args: PlayerRenderArgs){
  let pres = SDState().pCandidate
  let chan = SDState().cCandidate
  if(args.appState !== "inGame") return null
  if(!inSD()) return null
  let str = ""
  if(args.p === pres) str = "P"
  else if(args.p === chan) str = "C"
  return <div className = "square">
    {str}
  </div>
}

columns.push({idx: -10, comp: TeamSquare})
columns.push({idx: -5, comp: Government})
columns.push({idx: 10, comp: Influence})