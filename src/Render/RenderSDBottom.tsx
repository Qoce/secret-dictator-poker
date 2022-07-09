import Actions from "../Model/Actions"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "../Model/Players"
import RenderPhase from "./RenderPhase"
import {RenderPhaseArgs} from "./RenderPhase"
import Settings from "../Model/Settings"
import SDState from "../Model/SecretDictator"
import {useState, createRef} from 'react'
import {VoteSquare, PolicySquare} from "./SDUtils"



function confirmRenderer(title: string){
  function renderConfirm(args: RenderPhaseArgs){
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
      {title}
    </button>
  }
  return renderConfirm
}

RenderPhase[Phase.nominate] = confirmRenderer("Confirm Nomination")
RenderPhase[Phase.assasinate] = confirmRenderer("Confirm Assasination")
RenderPhase[Phase.investigate] = confirmRenderer("Confirm Investigation")
RenderPhase[Phase.pickPres] = confirmRenderer("Confirm President")

RenderPhase[Phase.vote] = function Votes(args: RenderPhaseArgs){
  function vote(yes: boolean){
    return function sendVote(){
      Actions.fire({
        p: args.p,
        v: (influence + 0.5) * (yes ? 1 : -1)
      })
    }
  }

  const [influence, setInfluence] = useState(0)
  let p = Players.get(args.p)
  return <div className = "center">
    <div className = "board-row">
      <input className = "textInput" type = 'number' min = {0} max = {p.role.influence}
        onChange = {(event) => setInfluence(+event.target.value)}/>
    </div>
    <div className = "board-row">
      <VoteSquare onClick = {vote(true)} str = {"✔️"}/>
      <VoteSquare onClick = {vote(false)} str = {"❌"}/>
    </div>
  </div>
}

RenderPhase[Phase.bribe] = function Votes(args: RenderPhaseArgs){
  const [influence, setInfluence] = useState(0)
  let p = Players.get(args.p)
  return <div className = "center">
    <div className = "board-row">
      <input className = "textInput" type = 'number' min = {0} max = {p.role.influence}
        onChange = {(event) => setInfluence(+event.target.value)}/>
      <button className = "button" onClick = {() => {
        Actions.fire({
          p: args.p,
          v: influence
        })
      }}>
        {influence > 0 ? "Send Bribe" : "No Bribe"}
      </button>
    </div>
  </div>
}

function ConsiderBribe(args: RenderPhaseArgs){
  function decision(accept: boolean){
    return () => Actions.fire({
      p: args.p,
      v: accept ? 1 : 0
    })
  }

  let influence = SDState().activeBriber?.role.spent
  if(!influence) throw "Error: bribe size is 0 or undefined and we are trying to render the bribe ui"
  return <div className = "center">
    <div>
      {"Best Bribe: " + influence}
    </div>
    <button className = "button" onClick = {decision(true)}>
      {"Accept Bribe"}
    </button>
    <button className = "button" onClick = {decision(true)}>
      {"Decline Bribe"}
    </button>
  </div>
}

RenderPhase[Phase.presBribe] = ConsiderBribe
RenderPhase[Phase.chanBribe] = ConsiderBribe

interface PolicyArgs{
  selectable: boolean,
  inverted: boolean //if true we select all but one, if false we select one
  vetoButton: boolean
}


function Policies(args: PolicyArgs){
  return function Temp(phaseArgs: RenderPhaseArgs){
    let policies = SDState().activePolicies
    let [selections, setSelections] = useState(policies.map(() => false))
    let indicies: number[] = []
    for(let i in policies) indicies.push(+i)
    
    let disabled: boolean
    if(args.inverted) disabled = selections.filter(p => p).length === policies.length - 1
    else disabled = selections.filter(p => p).length === 1

    let veto : undefined | JSX.Element
    if(args.vetoButton && SDState().fPassed === 5){
      <button className = "button" onClick = {() => 
        Actions.fire({
          p: phaseArgs.p,
          v: -1
        })
      }>
        {"Veto"}
      </button>
    }

    return <div className = "center">
      <div className = "board-row">
        {indicies.map(i => <PolicySquare team = {policies[i]} selectable = {args.selectable}
          selected = {selections[i]} setSelected = {(s: boolean) => {
            selections[i] = s
            setSelections(selections)
          }}/>)}
      </div>
      <button className = "button" onClick = {() =>
        Actions.fire({
          p: phaseArgs.p,
          v: selections.indexOf(!args.inverted)
        })}
        disabled = {disabled}>
      </button>
      {veto}
    </div>
  }
}

RenderPhase[Phase.president] = Policies({selectable: true, inverted: true, vetoButton: false})
RenderPhase[Phase.chancellor] = Policies({selectable: true, inverted: false, vetoButton: true})
RenderPhase[Phase.peak] = Policies({selectable: false, inverted: true, vetoButton: false})

RenderPhase[Phase.veto] = (args: RenderPhaseArgs) => {
  return <div className = "center">
    <button className = "button" onClick = {() => Actions.fire({p: args.p, v: 1})}> 
      {"Concur with Veto"}
    </button>
    <button className = "button" onClick = {() => Actions.fire({p: args.p, v: 0})}> 
      {"Override Veto"}
    </button>
  </div>
}