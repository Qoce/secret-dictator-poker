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
  clearHistory(){
    actionHistory = []
    actionLog = [[]]
  },
  resimulate(upTo : number = actionHistory.length){
    Rng.setSeed(this.startingSeed)
    Players.reset()
    this.onReset.forEach(f => f())

    actionLog = [[]]
    
    //TODO: this should be moved... this code should work outside of this specific game
    if(gameMode() !== "P") Game.setPhase(Phase.nominate)
    if(gameMode() !== "SD") Game.setPhase(Phase.poker)

    for(let i in actionHistory){
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
    this.setTimer()
    this.onAction()
  },
  reset(){
    this.clearHistory()
    this.resimulate()
  },
  log(emts : (LogContent)[] | (LogContent)){
    if(!Array.isArray(emts)) emts = [emts]
    actionLog[actionLog.length - 1].push(emts)
  },
  getActionLog(){
    return actionLog
  },
  loadActions(actions : ActionArgs[]){
    actionHistory = actions
    this.resimulate()
  }
}

export default a
