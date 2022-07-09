import ActionArgs from "./../Interface/Action"
import Player from "./../Interface/Player"
import Players from "./Players"
import Phase from "../Interface/Phase"
import Game from "./Game"

let actions = new Map<Phase, (args: ActionArgs) => boolean>() //{[key in Phase]: (args: ActionArgs) => boolean}
let actionHistory : ActionArgs[] = []
let actionLog : (string | JSX.Element)[][][] = [[]]

export default {
  onAction(){

  },
  register(phase: Phase, action: (args: ActionArgs) => boolean){
    if(phase in actions) throw 'Error: Action for ' + phase + ' already registered!'
    actions.set(phase, action)
  },
  fire(args: ActionArgs){
    let player = Players.get(args.p)
    let target = args.t && Players.get(args.t)
    if(player.canAct && (!target || target.targetable)) {
      actionLog.push([])
      actionHistory.push(args)
      let am = actions.get(Game.getPhase())
      if(am) am(args)
    }
    this.onAction()
    //TODO: force-rerender
  },
  clearHistory(){
    actionHistory = []
    actionLog = []
  },
  resimulate(){
    //TODO: reset game / rewind
    for(let ev of actionHistory){
      let am = actions.get(Game.getPhase())
      if(am) am(ev)
    }
    //TODO: force-rerender
  },
  log(emts : (string | JSX.Element)[] | (string | JSX.Element), params : {viewFunc?: (p: Player) => boolean, visibile?: boolean} = 
    {viewFunc: (p: Player) => true, visibile: true}){
    if(!Array.isArray(emts)) emts = [emts]
    actionLog[actionLog.length - 1].push(emts)
    console.log(emts)
  },
  getActionLog(){
    console.log(actionLog)
    return actionLog
  }
}
