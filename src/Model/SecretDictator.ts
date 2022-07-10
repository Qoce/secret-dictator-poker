import Players from "./Players"
import Player from '../Interface/Player'
import RNG from "./Rng"
import {Team, Role} from "../Interface/Role"
import Actions from "./Actions"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Settings from "./Settings"
import { BADHINTS } from "dns"
import ActionArgs from "../Interface/Action"
import {colorPolicy} from '../Render/SDUtils'

let SpecialPhases = [
  //5,6
  [Phase.nominate, Phase.nominate, Phase.peak, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //7,8
  [Phase.nominate, Phase.peak, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //9,10
  [Phase.peak, Phase.peak, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame]
]

let pCandidate: Player 
let cCandidate: Player | undefined
let president : Player | undefined
let chancellor: Player | undefined
let forcedPCandidate: Player | undefined
let failCount = 0
let bribers : Player[]
let activeBriber : Player | undefined
let policyDeck : ("l" | "f")[] = []
let discard : ("l" | "f")[] = []
let activePolicies : ("l" | "f")[] = []
let lPassed = 0
let fPassed = 0
let initalized = false

export function initSD(){
  bribers = []
  forcedPCandidate = undefined
  failCount = 0
  activeBriber = undefined
  lPassed = 0
  fPassed = 0

  let players = Players.players
  if(players.length < 5) throw 'not enough players to start secret dictator'
  let nFascist = Math.floor((players.length - 3) / 2)
  let teams : number[] = []
  for(let _ in players) teams.push(Team.liberal)

  teams[RNG.nextInt(teams.length)] = Team.dictator
  for(let i = 0; i < nFascist; i++){
    let j = RNG.nextInt(teams.length)
    while(teams[j] !== Team.liberal){
      j = RNG.nextInt(teams.length)
    }
    teams[j] = Team.fascist
  }
  let vision : Player[][] = []
  for(let i in teams) {
    let v : Player[] = []
    for(let j in teams){
      if(i === j){
        v.push(players[j])
      }
      else if(teams[i] === Team.fascist){
        v.push(players[j])
      }
      else if(teams[i] === Team.dictator && nFascist === 1){
        v.push(players[j])
      }
    }
    vision.push(v)
  }
  let i = 0
  Actions.log("Teams:")
  Players.apply(p => {
    p.role = {
      team: teams[i],
      vision: vision[i++], //fear me
      influence: p.bank,
      spent: 0,
      vote: undefined
    }
    Actions.log({content: p.name + ": " + Team[p.role.team], visibleTo: Players.players.indexOf(p)})
  })
  pCandidate = players[RNG.nextInt(players.length)]
  if(pCandidate.bank === 0) {
    const nl = Players.nextLiving(pCandidate)
    if(!nl) throw Error("no valid presidential candidate")
    pCandidate = Players.get(nl)
  }

  policyDeck = Array(Settings.fPolicyCount).fill("f").concat(Array(Settings.lPolicyCount).fill("l"))
  discard = []
  activePolicies = []
  //shuffles policyDeck
  RNG.randomize(policyDeck)
}

function nextpCandidcate(){
  let next = Players.nextLiving(pCandidate)
  if(!next) throw "Error: no valid presidential candidate"
  pCandidate = Players.get(next)
  Game.setPhase(Phase.nominate)
}

Game.setPhaseListener(Phase.nominate, () => {
  if(!initalized){
    initSD()
    initalized = true
  }
  Players.apply(p => p.canAct = p === pCandidate)
  Players.apply(p => p.targetable = (p !== pCandidate && p !== president && p !== chancellor && p.bank > 0))
})

Actions.register(Phase.nominate, (args : ActionArgs) => {
  if(!args.t) return false
  let p = Players.get(args.t)
  cCandidate = p
  Actions.log(pCandidate.name + " nominates " + cCandidate.name)
  Game.setPhase(Phase.vote)
  return true
})

Game.setPhaseListener(Phase.vote, () => {
  Players.apply(p => p.canAct = p.bank > 0)
  Players.apply(p => p.targetable = false)
  Players.apply(p => p.role.vote = undefined)
  Players.apply(p => p.role.spent = 0)
})

Actions.register(Phase.vote, (args: ActionArgs) => {
  let size = args.v
  let p = Players.get(args.p)
  if(!size) return false
  if(Math.abs(size) > p.role.influence) return false
  p.role.vote = size > 0
  p.role.spent = Math.floor(Math.abs(size))
  p.role.influence -= Math.floor(Math.abs(size))
  p.canAct = false
  Actions.log([p.name + " votes ",  {content: ["✔️", "❌"][p.role.vote ? 0 : 1] + " " + p.role.spent, visibleTo: Players.players.indexOf(p)}])
  if(Players.allDoneActing()) checkVotes()
  return true
})

function checkVotes(){
  let spents = Players.players.map(p => p.role.spent)
  let votes = Players.players.map(p => p.role.vote)
  let yesSum = 0
  let noSum = 0
  for(let i = 0; i < spents.length; i++){
    if(votes[i]) yesSum += spents[i] + Settings.freeInfluence
    else noSum += spents[i] + Settings.freeInfluence
  }
  Actions.log("✔️: " + yesSum)
  Actions.log("❌: " + noSum)
  if(yesSum > noSum){
    Actions.log("The vote passes")
    president = pCandidate
    chancellor = cCandidate
    Game.setPhase(Phase.bribe)
  }
  else failGovernment()
}

function failGovernment(){
  if(failCount < 3){
    failCount++
    nextpCandidcate()
  }
  else{
    drawPolicies(1)
    passPolicy(0, true)
  }
}

Game.setPhaseListener(Phase.bribe, () => {
  Players.apply(p => p.role.spent = 0)
  Players.apply(p => p.canAct = p !== president && p !== chancellor)
  Players.apply(p => p.targetable = false)
  activeBriber = undefined
  //Skip phase if there is nobody outside of the government with influence
  if(Players.allDoneActing()) Game.setPhase(Phase.president)
})

Actions.register(Phase.bribe, (ActionArgs) => {
  if(ActionArgs.v === undefined) return false
  let size = ActionArgs.v
  let p = Players.get(ActionArgs.p)
  if(size < 0 || size > p.role.influence) return false
  Actions.log([p.name + " bribes ", {content: "" + size, visibleTo: Players.players.indexOf(p)}])
  p.role.spent = size
  p.canAct = false
  if(Players.allDoneActing()) {
    bribers = Players.filter(p => p !== president && p !== chancellor && p.role.spent > 0)
    RNG.randomize(bribers)
    bribers.sort((a,b) => b.role.spent - a.role.spent)
    if(bribers.length > 0){
      activeBriber = bribers[0]
      Game.setPhase(Phase.presBribe)
    }
    else{
      Game.setPhase(Phase.president)
    }
  }
  return true
})

Game.setPhaseListener(Phase.presBribe, () => {
  Players.apply(p => p.targetable = false)
  Players.apply(p => p.canAct = p === president)
})

Actions.register(Phase.presBribe, (ActionArgs) => {
  if(ActionArgs.v === undefined) return false
  if(!activeBriber) throw Error("No briber found yet we are in presBribe phase")
  if(ActionArgs.v === 1){
    Actions.log({content: "President " + pCandidate.name + " accepts bribe of " + activeBriber.role.spent + " from " + 
      activeBriber.name, visibleTo: [Players.players.indexOf(pCandidate), Players.players.indexOf(activeBriber)]})
    president = activeBriber
  }
  else{
    Actions.log({content: "President " + pCandidate.name + " declines bribe of " + activeBriber.role.spent + " from " + 
    activeBriber.name, visibleTo: [Players.players.indexOf(pCandidate), Players.players.indexOf(activeBriber)]})
    president = Players.get(ActionArgs.p)
  }
  Game.setPhase(Phase.president)
  return true
})

function peakPolicies(n: number){
  if(policyDeck.length < n){
    discard = discard.concat(policyDeck)
    if(discard.length < n) throw "not enough policy choices left to reshuffle: " + discard
    RNG.randomize(discard)
    policyDeck = discard
    discard = []
  }
  return policyDeck.slice(0,n)
}

function drawPolicies(n: number){
  peakPolicies(n)
  activePolicies = policyDeck.splice(0,n)
}

Game.setPhaseListener(Phase.president, () => {
  drawPolicies(3)
  printPolicies(president?.name + " sees: ", activePolicies, president)
  Players.apply(p => p.targetable = false)
  Players.apply(p => p.canAct = p === president)
})

Actions.register(Phase.president, (args: ActionArgs) => {
  let v = args.v
  if(v === undefined || v < 0 || v >= activePolicies.length) return false
  activePolicies.splice(v,1)
  Actions.log([president?.name + " sends ", ...activePolicies.map(colorPolicy)])
  if(bribers.length > 1){
    activeBriber = bribers[1]
    Game.setPhase(Phase.chanBribe)
  }
  else{
    Game.setPhase(Phase.chancellor)
  }
  return true
})

Game.setPhaseListener(Phase.chanBribe, () => {
  Players.apply(p => p.targetable = false)
  Players.apply(p => p.canAct = p === chancellor)
})

Actions.register(Phase.chanBribe, (ActionArgs) => {
  if(ActionArgs.v === undefined) return false
  if(!activeBriber) throw Error("No briber found yet we are in chanBribe phase")
  if(!cCandidate) throw Error("No cCanidate found yet we are in chanBribe phase")
  if(ActionArgs.v === 1){
    Actions.log({content: "Chancellor " + cCandidate.name + " accepts bribe of " + activeBriber.role.spent + " from " + 
      activeBriber.name, visibleTo: [Players.players.indexOf(pCandidate), Players.players.indexOf(activeBriber)]})
    chancellor = activeBriber
  }
  else{
    Actions.log({content: "Chancellor " + cCandidate.name + " declines bribe of " + activeBriber.role.spent + " from " + 
      activeBriber.name, visibleTo: [Players.players.indexOf(pCandidate), Players.players.indexOf(activeBriber)]})
    chancellor = Players.get(ActionArgs.p)
  }
  Game.setPhase(Phase.chancellor)
  return true
})

Game.setPhaseListener(Phase.chancellor, () => {
  Players.apply(p => p.canAct = p === chancellor)
  printPolicies(chancellor?.name + " sees: ", activePolicies, chancellor)
})

Actions.register(Phase.chancellor, (args: ActionArgs) => {
  if(args.v === undefined) return false
  if(args.v === -1) {
    Game.setPhase(Phase.veto)
    Actions.log(chancellor?.name + " vetoes the policies")
  }
  else {
    Actions.log([chancellor?.name + " passes ", colorPolicy(activePolicies[args.v])])
    passPolicy(args.v)
  }
  return true
})

function passPolicy(a: number, topCard = false){
  if(a < 0 || a >= activePolicies.length) return false
  let policy = activePolicies.splice(a,1)[0]
  if(policy === "l"){
    Actions.log(pCandidate?.name + " and " + cCandidate?.name + " have passed a liberal policy")
    lPassed++
    if(lPassed === 5){
      liberalWin()
    }
    else{
      Players.applyLiving(p => p.role.influence += Settings.ecoBase)
      exitSD()
      Game.setPhase(Phase.poker)
    }
  }
  else if(policy === "f"){
    Actions.log(pCandidate?.name + " and " + cCandidate?.name + " have passed a fascist policy")
    let special = getSpecialPhase(fPassed++)
    if(special === Phase.endgame) fascistWin()
    else if(topCard || special === Phase.nominate) {
      exitSD()
    }
    else Game.setPhase(special)
  }
}

Game.setPhaseListener(Phase.assassinate, () => {
  Players.apply(p => p.canAct = p === president)
  Players.apply(p => p.targetable = p !== president && p.bank > 0)
})

Actions.register(Phase.assassinate, (args: ActionArgs) => {
  if(args.t === undefined) return false
  let t = Players.get(args.t)
  t.bank = 0
  t.role.influence = 0
  Actions.log(t.name + " assassinates " + Players.get(args.p).name)
  Players.updateBanks(p => p.bank)
  if(Game.getPhase() !== Phase.endgame) exitSD()
  return true
})

Game.setPhaseListener(Phase.investigate, () => {
  Players.apply(p => p.canAct = p === president)
  Players.apply(p => p.targetable = p !== president)
})

Actions.register(Phase.investigate, (args: ActionArgs) => {
  if(args.t === undefined) return false
  Actions.log(Players.get(args.p).name + " investigates " + Players.get(args.t).name)
  Actions.log({content: Players.get(args.t).name + " is " + Players.get(args.t).role.team, visibleTo: args.p})
  Players.get(args.p).role.vision.push(Players.get(args.t))
  exitSD()
  return true
})

function printPolicies(label: string, policies: ("l" | "f")[], p: Player | Player[] | undefined){
  if(!(p instanceof Array)) {
    if(p === undefined) throw "error: printPolicies called with undefined player"
    p = [p]
  }
  let pels = policies.map(colorPolicy).map(x => {return {content: x, visibleTo: 
    (p as Player[]).map(pl => Players.players.indexOf(pl))
  }})
  Actions.log([label, ...pels])
}

Game.setPhaseListener(Phase.peak, () => {
  Players.apply(p => p.canAct = p === president)
  printPolicies("Next 3 Policies: ", peakPolicies(3), president)
})

Actions.register(Phase.peak, (args: ActionArgs) => {
  Actions.log(Players.get(args.p).name + " peaks at the next 3 policies")
  exitSD()
  return true
})

Game.setPhaseListener(Phase.pickPres, () => {
  Players.apply(p => p.canAct = p === president)
  Players.apply(p => p.targetable = p !== president && p.bank > 0)
})

Actions.register(Phase.pickPres, (args: ActionArgs) => {
  if(args.t === undefined) return false
  forcedPCandidate = Players.get(args.t)
  Actions.log(forcedPCandidate + " selected as next presidential candidate")
  exitSD()
  return true
})

Game.setPhaseListener(Phase.veto, () => {
  Players.apply(p => p.canAct = p === president)
})

Actions.register(Phase.veto, (args: ActionArgs) => {
  if(chancellor === undefined) throw "Error: no chancellor exists during veto phase"
  if(args.v === 1){
    Actions.log(Players.get(args.p).name + " and " + chancellor.name + " have vetoed their policy choices")
    failGovernment()
    return true
  }
  else if(args.v === 0){
    Actions.log(president?.name + " refuses the veto.")
    Game.setPhase(Phase.chancellor)
    return true
  }
  return false
})

Game.setPhaseListener(Phase.endgame, () => {})

function loot(w: Player[], l: Player[]){
  const lSum = l.map(p => p.bank).reduce((a,b) => a+b)
  l.forEach(p => p.bank = Math.floor(p.bank / 2))
  w.forEach(p => p.bank += Math.floor(lSum / w.length))
}

function liberalWin(){
  const fascists = Players.filter(p => p.role.team !== Team.liberal)
  const liberals = Players.filter(p => p.role.team === Team.liberal)
  loot(liberals, fascists)
  Actions.log("Liberals Win")
  exitSD(Phase.endgame, false)
}

function fascistWin(){
  const fascists = Players.filter(p => p.role.team !== Team.liberal)
  const liberals = Players.filter(p => p.role.team === Team.liberal)
  loot(fascists, liberals)
  Actions.log("Fascists Win")
  exitSD(Phase.endgame, false)
}

Players.onLiberalWin = liberalWin
Players.onFascistWin = fascistWin

function exitSD(phase = Phase.poker, ub: boolean = true){
  cCandidate = undefined
  discard = discard.concat(activePolicies)
  activePolicies = []
  failCount = 0
  if(ub) Players.updateBanks(p => p.role.influence)
  Game.setPhase(phase)
}

Actions.onReset.push(() => {initalized = false})

export function getSpecialPhase(n: number){
  let playerLength = Players.players.length
  return SpecialPhases[Math.floor(playerLength - 5) / 2][n]
}

export default function getSDState(){
  return {
    cCandidate: cCandidate,
    chancellor: chancellor,
    failCount: failCount,
    fPassed: fPassed,
    lPassed: lPassed,
    pCandidate: pCandidate,
    president: president,
    bg: Math.floor(240 + (5 - lPassed) / (11 - lPassed - fPassed)  * 120),
    activeBriber: activeBriber,
    activePolicies: activePolicies,
    peakPolicies: policyDeck.slice(0,3)
  }
}

export function setFPassed(n: number){
  fPassed = n
}

export function setLPassed(n: number){
  lPassed = n
}