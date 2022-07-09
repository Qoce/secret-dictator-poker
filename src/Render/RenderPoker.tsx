import Actions from "../Model/Actions"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "../Model/Players"
import PokerState from "../Model/Poker"
import RenderPhase, { RenderPhaseArgs } from "./RenderPhase"

import {getCardString} from './PokerUtils'
import {useState} from 'react'


function Center(){
  return <div>
    <div className = "board-row">
      <div className = "cards">
        {"Pot:"}
      </div>
      <div className = "cards">
        {PokerState().pot}
      </div>
    </div>
    <div className = "board-row">
      <div className = "cards">
        {"Center:"}
      </div>
      <div className = "cards" style = {{width: "172px"}}>
        {PokerState().center.map(getCardString)}
      </div>
    </div>
  </div>
}

function PokerAction(args: RenderPhaseArgs){
  const [betAmt, setBetAmt] = useState(0)
  let user = Players.get(args.p)
  if(user === undefined) throw "undefined user"
  let cost = PokerState().maxAmtIn - user.curHand.amtIn
  let stack = user.curHand.stack
  let minRaise = Math.min(cost + PokerState().minRaise, stack)
  if(user.canAct){
    let call: undefined | JSX.Element
    if(cost > 0){
      let callCost = stack > cost ? cost : stack
      call = <button className = "button" onClick = {() =>{
        Actions.fire({
          p: args.p,
          v: callCost
        })}}>
      {"Call " + callCost + (callCost === stack ? " (All in!)" : "")}
    </button>
    }
    let bet: undefined | JSX.Element
    let input: undefined | JSX.Element
    if(stack > cost){
      bet = <button className = "button" onClick = {() => 
        Actions.fire({
          p: args.p,
          v: minRaise
        })}>
        {(cost === 0 ? "Bet " : "Raise ") + minRaise + (minRaise === stack ? "(All in!)" : "")}
      </button>
      if(stack > minRaise){
        input = <div className = "board-row">
          <input className = "textInput" type = 'number' min = {0} max = {stack} 
            value = {betAmt}
            onChange = {(event) => setBetAmt(+event.target.value)}/>
          <button className = "button" disabled = {betAmt < minRaise || betAmt > stack}
          onClick = {() => 
            Actions.fire({
              p: args.p,
              v: betAmt
            })}>
            {(cost === 0 ? "Bet " : "Raise ") + betAmt + (betAmt === stack ? "(All in!)" : "")}
          </button>
        </div>
      }
    }
    return <div>
      <div className = "board-row">
        <button className = "button" onClick = {() =>
          Actions.fire({
            p: args.p,
            v: 0
          })
        }>
          {cost > 0 ? "Fold" : "Check"}
        </button>
        {call}
        {bet}
      </div>
      {input}
    </div>
  }
  else{
    return null
  }
}

RenderPhase[Phase.poker] = function renderPoker(args : RenderPhaseArgs){
  return <div className = "center">
    <Center />
    <PokerAction p = {args.p} t = {args.t}/>
  </div>
}
