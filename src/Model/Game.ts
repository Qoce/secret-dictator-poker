import Phase from "../Interface/Phase"

let p : Phase = Phase.poker
let phaseListeners = new Map<Phase, () => void>()
let game = {
  setPhase(phase : Phase){
    p = phase
    let pl = phaseListeners.get(phase)
    if(pl !== undefined) pl()
    else throw Error("Phase " + phase + " missing a phase listener")
  },
  getPhase(){
    return p
  },
  setPhaseListener(phase: Phase, listener: () => void){
    if(phase in phaseListeners) throw Error("Phase listener " + phase + " set twice!")
    else phaseListeners.set(phase, listener)
  },
  reset(){
    p = Phase.poker
  }
}

export default game