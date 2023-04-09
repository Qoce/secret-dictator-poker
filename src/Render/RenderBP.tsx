import {BooleanDecision, confirmOrPassRenderer} from "./RenderUtils"
import Phase from "../Interface/Phase"
import RenderPhase, { RenderPhaseArgs } from "./RenderPhase"
import { inPact, pactMembers } from "../Model/BloodPact"

import { PlayerRenderArgs } from "./RenderPlayer"
import SDState from "../Model/SecretDictator"
import BPRole from "../Interface/BPRole"
import {columns} from "./RenderPlayer"
import {classWidths} from "../Utils/CSSRef"

RenderPhase.set(Phase.bloodpactPropose, confirmOrPassRenderer("Confirm Blood Pact Invitation"))
RenderPhase.set(Phase.bloodpactView, (args: RenderPhaseArgs) => {
  let members = pactMembers()
  let l : string[] = []
  for(let m of members){
    l.push(m.name)
    l.push(", ")
  }
  l.pop()
  return <BooleanDecision title = {() => ["Blood Pact Invitation from ",
    ...l].reduce((a,b) => a.concat(b))} p = {args.p} t = {args.t}/>
})
RenderPhase.set(Phase.bloodpactAccuse, confirmOrPassRenderer("Confirm Blood Pact Accusation"))

function BPRoleSquare(args: PlayerRenderArgs){
  let str = ""
  if(args.appState === "inGame")
    if(SDState().bpPassed > 0)
      if(args.u.bpRole !== BPRole.None)
        if(args.u.bpRole !== BPRole.Investigator || (args.p === args.u)){
          if(args.p.bpRole === BPRole.Investigator) str = "🧐"
          else if(args.p.bpRole === BPRole.Founder) str = "😈"
          else if(args.p.bpRole === BPRole.Member) str = "🩸"
        }
  return <div className = "square">
    {str}
  </div>
}

columns.push({idx: -20, comp: BPRoleSquare, width: classWidths['square']})