import {classWidths} from "../Utils/CSSRef"
import Game from "../Model/Game"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "../Model/Players"
import dealer, { isStud } from "../Model/Poker"
import Settings from "../Model/Settings"
import {getCardString} from "./PokerUtils"
import {PlayerRenderArgs} from "./RenderPlayer"
import {columns, BankVision} from "./RenderPlayer"


function Stack(args: PlayerRenderArgs){
  if(!Settings.atLeast("investigationPower", "Role + Bank")) return null
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
  if(isStud()) return null
  return <div className = "square cleanFont">
    {getBlindString(args.p)}
  </div>
}

function AmtIn(args: PlayerRenderArgs){
  if(!inPoker(args)) return null
  return <div className = "cards cleanFont">
    {args.p.curHand.amtIn}
  </div>
}

function getDownCards(){
  switch(Settings.getString("pokerType")){
    case "Texas Hold'em": return 2
    case "Omaha": return 4
    case "5 Card Draw": return 5
    case "7 Card Stud": return 2
    default: return 0
  }
}

function Cards(args: PlayerRenderArgs){
  if(Settings.getString("investigationPower") !== "Role + Bank + Cards")
    return null
  if(inPoker(args)){
    const show = args.p === args.u || args.u.bankVision.includes(args.p)
    return <div className = "cards cleanFont" style = {{width: (40 * getDownCards()+ 22) + "px"}}>
      {show ? args.p.curHand.hand.map(getCardString) : null}
    </div>
  }
  return null
}

function UpCards(args: PlayerRenderArgs){
  if(inPoker(args) && isStud()){
    return <div className = "cards" style = {{width: "160px"}}>
      {!args.p.curHand.folded && args.p.curHand.upHand.map(getCardString)}
    </div>
  }
  return null
}

  

columns.push({idx: -5, comp: PokerPosition, width: classWidths['square'],
  title: "P"})
columns.push({idx: 5, comp: AmtIn, width: classWidths['cards'],
  title: "Amt In"})
columns.push({idx: 10, comp: Stack, width: classWidths['cards'],
  title: "Bank"})
columns.push({idx: 15, comp: Cards, width: classWidths['cards'],
  title: "Cards"})
columns.push({idx: 20, comp: UpCards, width: 160,
  title: "Up Cards"})
