import Game from "../Model/Game"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "../Model/Players"
import dealer from "../Model/Poker"
import Settings from "../Model/Settings"
import {getCardString} from "./PokerUtils"
import {PlayerRenderArgs} from "./RenderPlayer"
import {columns, BankVision} from "./RenderPlayer"


function Stack(args: PlayerRenderArgs){
  if(Game.getPhase() === Phase.poker){
    return BankVision(args, args.p.curHand.stack)
  }
  return null
}

function inPoker(args: PlayerRenderArgs){
  return args.appState === "inGame" && Game.getPhase() === Phase.poker
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

function PokerPosition(args: PlayerRenderArgs){
  if(!inPoker(args)) return null
  return <div className = "square">
    {getBlindString(args.p)}
  </div>
}

function AmtIn(args: PlayerRenderArgs){
  if(!inPoker(args)) return null
  return <div className = "cards">
    {args.p.curHand.amtIn}
  </div>
}

function Cards(args: PlayerRenderArgs){
  if(inPoker(args)){
    const show = args.p === args.u || (
      Settings.getString("investigationPower") === "Role + Bank + Cards" &&
      args.u.bankVision.includes(args.p))
    return <div className = "cards">
      {show ? args.p.curHand.hand.map(getCardString) : null}
    </div>
  }
  return null
}

  

columns.push({idx: -5, comp: PokerPosition})
columns.push({idx: 5, comp: AmtIn})
columns.push({idx: 10, comp: Stack})
columns.push({idx: 15, comp: Cards})