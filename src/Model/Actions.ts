import ActionArgs from "./../Interface/Action"
import Player from "./../Interface/Player"
import Players from "./Players"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Rng from "./Rng"

let actions = new Map<Phase, (args: ActionArgs) => boolean>() //{[key in Phase]: (args: ActionArgs) => boolean}
let actionHistory : ActionArgs[] = []
let actionLog : (string | JSX.Element | logElement)[][][] = [[]]
let actionIndex = 0

export interface logElement{
  visibleTo: number[] | number
  content: string | JSX.Element
}

export default {
  startingSeed: Rng.nextInt(1e9),
  onAction(){},
  onReset: [] as (() => void)[],
  register(phase: Phase, action: (args: ActionArgs) => boolean){
    if(phase in actions) throw 'Error: Action for ' + phase + ' already registered!'
    actions.set(phase, action)
  },
  fire(args: ActionArgs){
    let player = Players.get(args.p)
    let target = args.t && Players.get(args.t)

    //Rollback to where this action differs from the log and remove all actions after it
    if(actionIndex < actionHistory.length){
      actionHistory.splice(actionIndex)
      actionLog.splice(actionIndex + 1)
      this.resimulate()
    }
    if(player.canAct && (!target || target.targetable)) {
      actionLog.push([])
      actionHistory.push(args)
      let am = actions.get(Game.getPhase())
      if(am) am(args)
      actionIndex++
    }
    this.onAction()
  },
  clearHistory(){
    actionHistory = []
    actionLog = [[]]
    actionIndex = 0
  },
  resimulate(upTo : number = actionHistory.length){
    Rng.setSeed(this.startingSeed)
    Players.reset()
    this.onReset.forEach(f => f())

    Game.setPhase(Phase.poker)
    for(let i in actionHistory){
      if(+i >= upTo) {
        actionIndex = upTo
        actionLog.splice(upTo + 1)
        if(upTo === 0) actionLog = [[]]
        break
      }
      let am = actions.get(Game.getPhase())
      if(am) am(actionHistory[i])
    }
    this.onAction()
  },
  reset(){
    this.clearHistory()
    this.resimulate()
  },
  log(emts : (string | JSX.Element | logElement)[] | (string | JSX.Element | logElement)){
    if(!Array.isArray(emts)) emts = [emts]
    if(actionIndex < actionHistory.length || actionHistory.length == 0) 
      actionLog[actionLog.length - 1].push(emts)
  },
  getActionLog(){
    return actionLog
  },
}
