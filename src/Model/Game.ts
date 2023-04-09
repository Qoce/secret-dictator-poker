import Phase from "../Interface/Phase"

let p : Phase = Phase.poker
let phaseListeners = new Map<Phase, () => void>()
let phaseTimers = new Map<Phase, () => number>()

let game = {
  setPhase(phase : Phase){
    p = phase
    let pl = phaseListeners.get(phase)
    if(pl !== undefined) {
      pl()
      this.onPhaseChange()
    }
    else throw Error("Phase " + phase + " missing a phase listener")
    return true
  },
  getPhase(){
    return p
  },
  getPhaseTimer() : number{
    let tfunc = phaseTimers.get(p)
    return tfunc ? tfunc() : 0
  },
  onPhaseChange() : void {},
  setPhaseListener(phase: Phase, listener: () => void){
    if(phase in phaseListeners) throw Error("Phase listener " + phase + " set twice!")
    else phaseListeners.set(phase, listener)
  },
  setPhaseTimer(phase: Phase, timer: () => number){
    if(phase in phaseTimers) throw Error("Phase timer " + phase + " set twice!")
    else phaseTimers.set(phase, timer)
  },
  reset(){
    p = Phase.poker
  }
}

export default game