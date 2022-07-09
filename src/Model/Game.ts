import Phase from "../Interface/Phase"
import ActionArgs from "../Interface/Action"

let p : Phase = Phase.poker
let phaseListeners = new Map<Phase, () => void>()
export default {
  setPhase(phase : Phase){
    let pl = phaseListeners.get(phase)
    if(pl !== undefined) pl()
    else throw "error: phase " + phase + " missing a phase listener"
    p = phase
  },
  getPhase(){
    return p
  },
  setPhaseListener(phase: Phase, listener: () => void){
    if(phase in phaseListeners) throw "error: phase listener " + phase + " set twice!"
    else phaseListeners.set(phase, listener)
  }
}