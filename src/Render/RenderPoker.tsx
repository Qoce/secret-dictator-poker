import Actions from "../Model/Actions"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "../Model/Players"
import PokerState from "../Model/Poker"
import RenderPhase, { RenderPhaseArgs } from "./RenderPhase"

import {getCardString} from './PokerUtils'
import {useState, useCallback, useEffect} from 'react'


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
  let callCost = stack > cost ? cost : stack
  function fire(n : number){
    return () => {
      Actions.fire({
        p: args.p,
        v: n
      })
    }
  }
  let foldFunc = fire(0)
  let callFunc = fire(callCost)
  let betFunc = fire(minRaise)
  let customBetFunc = fire(betAmt)

  const handleUserKeyPress = useCallback((event : any) => {
    if(!user.canAct) return
    const { key, keyCode } = event;

    //if c is pressed
    if (key === "c" || keyCode === 67) {
      callFunc()
    }
    //if f is pressed
    if (key === "f" || keyCode === 70) {
      foldFunc()
    }
    //if b or r is pressed
    if (key === "b" || key === "r" || keyCode === 66 || keyCode === 82) {
      betFunc()
    }
  }, [user]);

  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);

    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [handleUserKeyPress]);

  if(user.canAct){
    let call: undefined | JSX.Element
    if(cost > 0){
      call = <button className = "button" onClick = {callFunc}>
      {"Call " + callCost + (callCost === stack ? " (All in!)" : "")}
    </button>
    }
    let bet: undefined | JSX.Element
    let input: undefined | JSX.Element
    if(stack > cost){
      bet = <button className = "button" onClick = {betFunc}>
        {(cost === 0 ? "Bet " : "Raise ") + minRaise + (minRaise === stack ? "(All in!)" : "")}
      </button>
      if(stack > minRaise){
        input = <div className = "board-row">
          <input className = "textInput" type = 'number' min = {0} max = {stack} 
            value = {betAmt}
            onChange = {(event) => {
              return setBetAmt(+event.target.value)
            }}/>
          <button className = "button" disabled = {betAmt < minRaise || betAmt > stack}
          onClick = {customBetFunc}>
            {(cost === 0 ? "Bet " : "Raise ") + betAmt + (betAmt === stack ? "(All in!)" : "")}
          </button>
        </div>
      }
    }
    return <div>
      <div className = "board-row">
        <button className = "button" onClick = {foldFunc}>
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

RenderPhase.set(Phase.poker, function renderPoker(args : RenderPhaseArgs){
  return <div className = "center">
    <Center />
    <PokerAction p = {args.p} t = {args.t}/>
  </div>
})
