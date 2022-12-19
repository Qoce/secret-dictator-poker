import { Team } from "../Interface/Role"
import Player from "./../Interface/Player"
import Actions from "./Actions"
import Settings from "./Settings"

class Players{
  players: Player[]

  constructor(){
    this.players = []
    //for(let i = 0; i < 10; i++) this.makeFakePlayer(i)
  }
  makeFakePlayer(i : number){
    this.initPlayer("debug " + i)
  }
  initFromNames(n: string[]){
    this.players = []
    n.forEach(this.initPlayer.bind(this))
  }
  initPlayer(n : string){
    this.players.push({
      bank: Settings.getNumber("startingBank"),
      name: n,
      canAct: false,
      targetable: false,
      curHand:{
        equity: 0,
        amtIn: 0,
        folded: false,
        hand: [],
        stack: 0,
        couldWin: 0,
        net: 0,
        checked: false,
      },
      role:{
        team: Team.liberal,
        vision: [],
        influence: 0,
        spent: 0,
        vote: undefined,
      },
      bankVision: [],
      connected: true,
      host: this.players.length === 0
    })
  }
  resetPlayer(p : Player){
    p.canAct = false
    p.targetable = false
    p.bank = Settings.getNumber('startingBank')
    p.curHand = {
      equity: 0,
      amtIn: 0,
      folded: false,
      hand: [],
      stack: 0,
      couldWin: 0,
      net: 0,
      checked: false,
    }
    p.role = {
      team: Team.liberal,
      vision: [],
      influence: 0,
      spent: 0,
      vote: undefined,
    }
  }
  reset(){
    this.apply(this.resetPlayer)
  }
  add(p : Player){
    this.players.push(p)
  }
  next(i : number | Player, condition : (p: Player) => boolean = _ => true) : number | false{
    if(typeof i !== "number") i = this.players.indexOf(i)
    if(i === -1) throw Error("player not found")
    let j = (i + 1) % this.players.length
    
    while(j !== i && !condition(this.players[j])) j = (j + 1) % this.players.length
    return i !== j && j
  }
  apply(action : (p : Player) => void, condition : (p: Player) => boolean = _ => true){
    let filtered = this.filter(condition)
    if(filtered.length > 0) filtered.map(action)
  }
  applyLiving(action : (p : Player) => void, condition : (p: Player) => boolean = _ => true){
    this.apply(action, p => p.bank > 0 && condition(p))
  }
  nextLiving(i : number | Player) : number | false{
    return this.next(i, p => p.bank > 0)
  }
  get(i : number){
    return this.players[i]
  }
  setActive(condition : ((p: Player) => boolean) | number | boolean = _ => true){
    let v = condition
    if(typeof condition === "number") condition = (p: Player) => this.get(+v) === p
    else if(typeof condition === "boolean") condition = _ => condition as boolean
    let f = condition as (p: Player) => boolean
    this.apply(p => p.canAct = true, f)
    this.apply(p => p.canAct = false, p => !f(p))
  }
  filter(condition: (p: Player) => boolean){
    return this.players.filter(condition)
  }
  all(condition: (p: Player) => boolean){                              
    return this.filter(condition).length === this.players.length
  }
  allLiving(condition: (p: Player) => boolean){
    return this.filter(p => p.bank > 0 && condition(p)).length === 
      this.players.filter(p => p.bank > 0).length
  }
  allDoneActing(){
    return this.allLiving(p => !p.canAct)
  }
  updateBanks(f : (p: Player) => number){
    let liberalsWon = false
    this.apply(p => {
      p.bank = f(p)
      if(p.bank === 0){
        Actions.log([p, " has died"])
        if(p.role.team === Team.dictator){
          Actions.log([p, " was the dictator"])
          liberalsWon = true
        }
      }
    })
    if(liberalsWon) {
      this.onLiberalWin()
    }
    else if(this.filter(p => p.role.team === Team.liberal && p.bank > 0).length === 0)
      this.onFascistWin()  
  }
  onFascistWin(){}
  onLiberalWin(){}
}

export default new Players()