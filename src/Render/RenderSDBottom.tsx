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


interface CRArgs extends RenderPhaseArgs{
  title: string
}

function Confirm(args: CRArgs){
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

function confirmRenderer(title: string){
  return (args: RenderPhaseArgs) => {
    return <Confirm title = {title} p = {args.p} t = {args.t}/>
  }
}

RenderPhase.set(Phase.nominate, confirmRenderer("Confirm Nomination"))
RenderPhase.set(Phase.assassinate, confirmRenderer("Confirm Assasination"))
RenderPhase.set(Phase.investigate, confirmRenderer("Confirm Investigation"))
RenderPhase.set(Phase.pickPres, confirmRenderer("Confirm President"))

function Votes(args: RenderPhaseArgs){
  const [influence, setInfluence] = useState(0)

  function vote(yes: boolean){
    return function sendVote(){
      Actions.fire({
        p: args.p,
        v: (influence + 0.5) * (yes ? 1 : -1)
      })
    }
  }

  let p = Players.get(args.p)
  return <div className = "center">
    <div className = "board-row">
      <div> {Settings.getNumber('freeInfluence') + " + "}</div>
      <input className = "textInput" type = 'number' min = {0} max = {p.role.influence}
        onChange = {(event) => setInfluence(+event.target.value)}/>
    </div>
    <div className = "board-row">
      <VoteSquare onClick = {vote(true)} str = {"✔️"}/>
      <VoteSquare onClick = {vote(false)} str = {"❌"}/>
    </div>
  </div>
}
RenderPhase.set(Phase.vote, (args: RenderPhaseArgs) => {return <Votes p = {args.p} t = {args.t}/>})

function Bribe(args: RenderPhaseArgs){
  const [influence, setInfluence] = useState(0)
  let p = Players.get(args.p)
  if(p.canAct)
  return <div>
    <div>
      <input className = "textInput" type = 'number' min = {0} max = {p.role.influence}
        onChange = {(event) => setInfluence(+event.target.value)}/>
    </div>
      <button className = "button" onClick = {() => {
        Actions.fire({
          p: args.p,
          v: influence
        })
      }}>
        {influence > 0 ? "Send Bribe" : "No Bribe"}
      </button>
    </div>
  return null
}

RenderPhase.set(Phase.bribe, (args: RenderPhaseArgs) => {return <Bribe p = {args.p} t = {args.t}/>})

function ConsiderBribe(args: RenderPhaseArgs){
  function decision(accept: boolean){
    return () => Actions.fire({
      p: args.p,
      v: accept ? 1 : 0
    })
  }

  if(!Players.get(args.p).canAct) return null

  let influence = SDState().activeBriber?.role.spent
  if(!influence) throw "Error: bribe size is 0 or undefined and we are trying to render the bribe ui"
  return <div className = "center">
    <div>
      {"Best Bribe: " + influence}
    </div>
    <button className = "button" onClick = {decision(true)}>
      {"Accept Bribe"}
    </button>
    <button className = "button" onClick = {decision(false)}>
      {"Decline Bribe"}
    </button>
  </div>
}

RenderPhase.set(Phase.presBribe, (args: RenderPhaseArgs) => {return <ConsiderBribe p = {args.p} t = {args.t}/>})
RenderPhase.set(Phase.chanBribe, (args: RenderPhaseArgs) => {return <ConsiderBribe p = {args.p} t = {args.t}/>})

interface PolicyArgs extends RenderPhaseArgs{
  selectable: boolean,
  inverted: boolean, //if true we select all but one, if false we select one
  vetoButton: boolean,
  buttonStr: string
}


function Policies(args: PolicyArgs){
  let policies = SDState().activePolicies
  
  
  let [selections, setSelections] = useState(policies.map(() => false))

  let disabled: boolean
  if(args.inverted) disabled = selections.filter(p => p).length !== policies.length - 1
  else disabled = selections.filter(p => p).length !== 1

  //Look at peakPolicies instead of active policies if the phase is peak
  if(!args.selectable) {
    policies = SDState().peakPolicies
    disabled = false
  }

  if(!Players.get(args.p).canAct) return null
  let indicies: number[] = []
  for(let i in policies) indicies.push(+i)

  let veto : undefined | JSX.Element
  if(args.vetoButton && SDState().fPassed === 5){
    <button className = "button" onClick = {() => 
      Actions.fire({
        p: args.p,
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
          //sets selections to copy of itself
          setSelections([...selections])
        }}/>)}
    </div>
    <button className = "button" onClick = {() =>
      Actions.fire({
        p: args.p,
        v: selections.indexOf(!args.inverted)
      })}
      disabled = {disabled}>
        {args.buttonStr}
    </button>
    {veto}
  </div> 
}

RenderPhase.set(Phase.president, ((args: RenderPhaseArgs) => <Policies selectable = {true} inverted = {true} vetoButton = {false}
  p = {args.p} t = {args.t} buttonStr = "Send Policies"/>))
RenderPhase.set(Phase.chancellor, ((args: RenderPhaseArgs) => <Policies selectable = {true} inverted = {false} vetoButton = {true}
  p = {args.p} t = {args.t} buttonStr = "Pass Policy"/>))
RenderPhase.set(Phase.peak, ((args: RenderPhaseArgs) => <Policies selectable = {false} inverted = {true} vetoButton = {false}
  p = {args.p} t = {args.t} buttonStr = "Done"/>))

RenderPhase.set(Phase.veto, (args: RenderPhaseArgs) => {
  return <div className = "center">
    <button className = "button" onClick = {() => Actions.fire({p: args.p, v: 1})}> 
      {"Concur with Veto"}
    </button>
    <button className = "button" onClick = {() => Actions.fire({p: args.p, v: 0})}> 
      {"Override Veto"}
    </button>
  </div>
})

RenderPhase.set(Phase.endgame, (args: RenderPhaseArgs) => {
  return null
})