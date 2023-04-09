import Actions from "../Model/Actions"
import Phase from "../Interface/Phase"
import Players from "../Model/Players"
import PokerState, {getBetLimit, isStud, studBetOptions} from "../Model/Poker"
import RenderPhase, { RenderPhaseArgs } from "./RenderPhase"

import {getCardString} from './PokerUtils'
import {useState, useCallback, useEffect} from 'react'


function Pot(){
  return <div className = "board-row">
  <div className = "cards">
    {"Pot:"}
  </div>
  <div className = "cards cleanFont">
    {PokerState().pot}
  </div>
</div>
}

function CenterCards(){
  if(PokerState().center.length > 0 || !isStud()) {
    return <div className = "board-row">
      <div className = "cards">
        {"Center:"}
      </div>
      <div className = "cards cleanFont" style = {{width: "200px"}}>
        {PokerState().center.map(getCardString)}
      </div>
    </div>
  }
  return null
}

function PlayerCards(args: {p: number}){
  let player = Players.get(args.p)
  if(player.curHand.hand.length > 0){
    return <div className = "board-row" style = {{"marginBottom" : "20px"}}>
      <div className = "cards">
        {"Cards:"}
      </div>
      <div className = "cards cleanFont">
        {player.curHand.hand.map(getCardString)}
      </div>
    </div>
  }
  return null
}

function PlayerStack(args: {p: number}){
  let player = Players.get(args.p)
  return <div className = "board-row">
  <div className = "cards">
    {"Stack:"}
  </div>
  <div className = "cards cleanFont">
    {player.curHand.stack}
  </div>
</div>
}

function PlayerInfo(args: RenderPhaseArgs){
  let player = Players.get(args.p)
  let color = {}
  if(player.curHand.folded) color = {color: "grey"}
  
  return <div className = "center" style = {color}>
    <PlayerStack p = {args.p}/>
    <PlayerCards p = {args.p}/>
  </div>
}

function Center(){
  return  <div>
    <Pot/>
    <CenterCards/>
  </div>
}

function BetButton(args: {amt: number, callCost: number, stack: number, p: number, enabled: boolean}){
  function fire(n : number){
    Actions.fire({
      p: args.p,
      v: n
    })
  }
  let str = "Fold"
  if(args.amt === args.callCost || (args.amt < args.callCost && args.amt === args.stack)){
    if(args.callCost > 0){
      str = "Call " + args.amt
    }
    else{
      str = "Check"
    }
  }
  else if(args.amt > args.callCost){
    str = args.callCost > 0 ? "Raise " : "Bet "
    str += args.amt
  }
  if(args.amt === args.stack){
    str += " All In"
  }
  return <button className = "button cleanFont" onClick = {() => {fire(args.amt)}} 
    disabled = {!args.enabled && (args.amt > 0 && args.amt !== args.callCost) && 
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

  function Button(n: number, enabled = true){
    return <BetButton amt = {n} callCost = {cost} stack = {stack} p = {args.p}
      enabled = {enabled}/>
  }

  let foldFunc = fire(0)
  let callFunc = fire(callCost)
  let betFunc = fire(minRaise)

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
    let buttons : JSX.Element[] = []
    let input: undefined | JSX.Element = undefined
    if(stack > cost){
      if(!isStud()){
        buttons.push(Button(0))
        if(cost > 0) buttons.push(Button(cost))
        buttons.push(Button(Math.min(minRaise,stack)))
        let calledPot = PokerState().pot + cost
        if(minRaise < stack){
          for(let i of [1 / 3, 1 / 2, 2 /3, 1]){
            let amt = Math.floor(calledPot * i) + cost
            if(amt > minRaise){
              if(amt >= stack) {
                buttons.push(Button(stack))
                break
              }
              else{
                buttons.push(Button(amt))
              }
            }
          }
        }
      }
      else{
        let opts = studBetOptions(user)
        for(let o of opts){
          if(o <= stack){
            buttons.push(Button(o))
          }
          if(o > stack){
            buttons.push(Button(stack))
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
          <input className = "textInput cleanFont" type = 'number' step = {1} min = {0} max = {maxBet} 
            value = {betAmt}
            onChange = {(event) => {
              return setBetAmt(Math.floor(+event.target.value))
            }}/>
          {Button(betAmt, false)}
        </div>
      }
    }
    else{
      buttons.push(Button(0))
      buttons.push(Button(stack))
    }
    return <div>
      <div className = "board-row">
        {buttons}
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
    <PlayerInfo p = {args.p}/>
    <Center/>
    <PokerAction p = {args.p} t = {args.t}/>
  </div>
})
