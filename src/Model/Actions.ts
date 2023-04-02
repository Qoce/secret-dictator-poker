import ActionArgs from "./../Interface/Action"
import Player from "./../Interface/Player"
import Players from "./Players"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Rng from "./Rng"
import {gameMode} from "./Settings"

export type LogContent = false | string | JSX.Element | Player | logElement
let actions = new Map<Phase, (args: ActionArgs) => boolean>() //{[key in Phase]: (args: ActionArgs) => boolean}
let actionHistory : ActionArgs[] = []
let actionLog : (LogContent)[][][] = [[]]

export interface logElement{
  visibleTo: number[] | number | false
  content: LogContent | (LogContent)[]
  delayed?: boolean
}

let a = {
  startingSeed: 0,
  socket: undefined as any,
  lobby: undefined as any,
  onAction(){},
  onReset: [] as (() => void)[],
  register(phase: Phase, action: (args: ActionArgs) => boolean){
    if(phase in actions) throw Error('Error: Action for ' + phase + ' already registered!')
    actions.set(phase, action)
  },
  fire(args: ActionArgs){
    this.socket.emit("action", this.lobby, args)
  },
  setTimer(){
    let timer = Game.getPhaseTimer()
    if(timer) {
      for(let player of Players.filter(p => p.canAct)){
        player.deadline = Date.now() + timer * 1000 
      }
      for(let player of Players.filter(p => !p.canAct)){
        player.deadline = 0
      }
    }
  },
  reset(){
    Rng.setSeed(this.startingSeed)
    Players.reset()
    this.onReset.forEach(f => f())

    actionLog = [[]]
    
    //TODO: this should be moved... this code should work outside of this specific game
    if(gameMode() !== "P") Game.setPhase(Phase.nominate)
    if(gameMode() !== "SD") Game.setPhase(Phase.poker)
  },
  resimulate(from: number = 0, upTo: number = actionHistory.length){
    for(let i = from; i < actionHistory.length; i++){
      if(+i >= upTo) {
        actionLog.splice(upTo + 1)
        break
      }
      let am = actions.get(Game.getPhase())
      let player = actionHistory[i].p
      let target = actionHistory[i].t
      if(Players.get(player).canAct && (!target || Players.get(target).targetable)){
        if(am) {
          actionLog.push([])
          am(actionHistory[i])
        }
      }
    }
    this.onAction()
  },
  log(emts : (LogContent)[] | (LogContent)){
    if(!Array.isArray(emts)) emts = [emts]
    actionLog[actionLog.length - 1].push(emts)
  },
  getActionLog(){
    return actionLog
  },
  loadActions(actions : ActionArgs[]){
    //If actionHistory is not equal to the start of actions fully resimulate
    if(actions.length <= actionHistory.length || !actionHistory.every(
      (val, idx) => val.p === actions[idx].p && val.t === actions[idx].t &&
        val.v === actions[idx].v
    )){
      actionHistory = actions
      this.reset()
      this.resimulate()
    }
    else{
      let n = actionHistory.length
      actionHistory = actions
      this.resimulate(n)
    }
  }
}

Game.onPhaseChange = a.setTimer

export default a