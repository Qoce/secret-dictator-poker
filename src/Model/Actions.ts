import ActionArgs from "./../Interface/Action"
import Player from "./../Interface/Player"
import Players from "./Players"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Rng from "./Rng"
import SocketIO from "socket.io"

let actions = new Map<Phase, (args: ActionArgs) => boolean>() //{[key in Phase]: (args: ActionArgs) => boolean}
let actionHistory : ActionArgs[] = []
let actionLog : (string | JSX.Element | Player | logElement)[][][] = [[]]
let actionIndex = 0

export interface logElement{
  visibleTo: number[] | number | false
  content: string | JSX.Element | Player | logElement | (string | JSX.Element | Player | logElement)[]
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
      // let am = actions.get(Game.getPhase())
      // if(am) am(args)
      actionIndex++  
    }
    this.socket.emit("action", this.lobby, args)
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

    actionLog = [[]]
    Game.setPhase(Phase.nominate)
    Game.setPhase(Phase.poker)

    for(let i in actionHistory){
      if(+i >= upTo) {
        actionIndex = upTo
        actionLog.splice(upTo + 1)
        break
      }
      let am = actions.get(Game.getPhase())
      if(am) {
        actionLog.push([])
        am(actionHistory[i])
      }
    }
    this.onAction()
  },
  reset(){
    this.clearHistory()
    this.resimulate()
  },
  log(emts : (string | JSX.Element | Player | logElement)[] | (string | JSX.Element | Player | logElement)){
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