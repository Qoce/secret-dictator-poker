import { Team } from "../Interface/Role"
import Player from "./../Interface/Player"
import Actions from "./Actions"
import Settings from "./Settings"
import rng from "./Rng"
import BPRole from "../Interface/BPRole"

class Players{
  players: Player[]

  constructor(){
    this.players = []
    //for(let i = 0; i < 10; i++) this.makeFakePlayer(i)
  }
  makeFakePlayer(i : number){
    this.initPlayer("debug " + i)
  }
  initFromNames(n: string[], c: boolean[] = []){
    this.players = []
    n.forEach(this.initPlayer.bind(this))
    for(let i in c){
      this.players[i].connected = c[i]
    }
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
        upHand: [],
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
      host: this.players.length === 0,
      dead: false,
      deadline: 0,
      timerCount: 0,
      bpRole: BPRole.None,
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
      upHand: [],
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
    p.dead = false
    p.bpRole = BPRole.None
    p.timerCount = 0
    p.deadline = 0
  }
  reset(){
    this.apply(this.resetPlayer)
    this.onKill = () => {}
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
    this.apply(action, p => !p.dead && condition(p))
  }
  nextLiving(i : number | Player) : number | false{
    return this.next(i, p => !p.dead)
  }
  get(i : number){
    return this.players[i]
  }
  setActors(condition: (p : Player) => boolean, includeDead: boolean = false, 
    soft: boolean = false){
    //soft set actors means we don't change the timers
    this.apply(p => {
      let temp = p.canAct
      p.canAct = condition(p) && (!p.dead || includeDead)
      if(!soft || p.canAct !== temp) Actions.updateTimer(p)
    })
  }
  filter(condition: (p: Player) => boolean){
    return this.players.filter(condition)
  }
  getIndices(condition: (p: Player) => boolean){
    return this.players.map((p, i) => condition(p) ? i : -1).filter(i => i !== -1)
  }
  all(condition: (p: Player) => boolean){                              
    return this.filter(condition).length === this.players.length
  }
  none(condition: (p: Player) => boolean){
    return this.all(p => !condition(p))
  }
  any(condition: (p: Player) => boolean){
    return !this.all(p => !condition(p))
  }
  living(){
    return this.filter(p => !p.dead)
  }
  allLiving(condition: (p: Player) => boolean){
    return this.filter(p => !p.dead && condition(p)).length === 
      this.players.filter(p => !p.dead).length
  }
  allDoneActing(){
    return this.allLiving(p => !p.canAct)
  }
  argMin(func: (p: Player) => number){
    let min = 0
    let minVal = Infinity
    for(let i = 0; i < this.players.length; i++){
      let val = func(this.players[i])
      if(val < minVal){
        min = i
        minVal = val
      }
    }
    return min
  }
  argMax(func: (p: Player) => number){
    return this.argMin(p => -func(p))
  }

  kill(func: (p : Player) => boolean){
    this.living().filter(func).forEach(p => {
      p.dead = true
      Actions.log([p, " has died"])
    })
    this.onKill()
  }

  updateBanks(f : (p: Player) => number){
    this.apply(p => {
      p.bank = f(p)
      if(p.bank === 0){
        Actions.log([p, " has died"])
        p.dead = true
      }
    }, p => !p.dead)
    this.onKill()
  }

  distribute(n : number, inc: (p: Player, n: number) => void, to: (p: Player) => boolean = _ => true){
    let ps = this.filter(p => !p.dead && to(p))
    let d = Math.floor(n / ps.length)
    let l = n % ps.length
    ps.map(p => inc(p, d))
    while(l > 0){
      let p : Player | undefined = ps.splice(rng.nextInt(ps.length),1)[0]
      if(p){
        inc(p,1)
      }
      l--
    }
  }
  onKill(){}
}

export default new Players()
