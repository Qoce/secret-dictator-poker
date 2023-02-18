import Actions from "../Model/Actions"
import Phase from "../Interface/Phase"
import Players from "../Model/Players"
import PokerState, {getBetLimit, isStud, studBetOptions} from "../Model/Poker"
import RenderPhase, { RenderPhaseArgs } from "./RenderPhase"

import {getCardString} from './PokerUtils'
import {useState, useCallback, useEffect} from 'react'


function Center(){
  if(!isStud()) return null
  return  <div>
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

function BetButton(args: {amt: number, callCost: number, stack: number, p: number}){
  function fire(n : number){
    Actions.fire({
      p: args.p,
      v: n
    })
  }
  let str = "Fold"
  if(args.amt === args.callCost){
    if(args.callCost > 0){
      str = "Call " + args.callCost
    }
    else{
      str = "Check"
    }
  }
  else if(args.amt > args.callCost){
    str = args.callCost > 0 ? "Raise " : "Bet "
    str += args.amt
    if(args.amt === args.stack){
      str += " All In"
    }
  }
  return <button className = "button" onClick = {() => {fire(args.amt)}} 
    disabled = {(args.amt > 0 && args.amt !== args.callCost) && 
      (args.amt < args.callCost + PokerState().minRaise || 
      args.amt > Math.min(getBetLimit(Players.get(args.p)), args.stack))}>
        {str}
    </button>
}

function PokerAction(args: RenderPhaseArgs){
  const [betAmt, setBetAmt] = useState(0)
  let user = Players.get(args.p)
  if(user === undefined) throw Error("undefined user")
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

  function Button(n: number){
    return <BetButton amt = {n} callCost = {cost} stack = {stack} p = {args.p}/>
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
  }, [user, betFunc, callFunc, foldFunc]);

  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);

    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [handleUserKeyPress]);

  if(user.canAct){
    let call: undefined | JSX.Element
    if(cost > 0){
      call = Button(callCost)
    }
    let bet: undefined | JSX.Element | JSX.Element[]
    let input: undefined | JSX.Element = undefined
    if(stack > cost){
      if(!isStud()){
        bet = Button(Math.min(minRaise,stack))
      }
      else{
        let opts = studBetOptions(user)
        bet = []
        for(let o of opts){
          if(o > callCost && o <= stack){
            bet.push(Button(o))
          }
          if(o > stack){
            bet.push(Button(stack))
          }
          if(o >= stack){
            break
          }
        }
      }
      if(!isStud() && stack > minRaise){
        let limit = getBetLimit(user)
        let maxBet = Math.min(stack, limit)
        input = <div className = "board-row">
          <input className = "textInput" type = 'number' min = {0} max = {maxBet} 
            value = {betAmt}
            onChange = {(event) => {
              return setBetAmt(+event.target.value)
            }}/>
          {Button(betAmt)}
        </div>
      }
    }
    return <div>
      <div className = "board-row">
        {Button(0)}
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
