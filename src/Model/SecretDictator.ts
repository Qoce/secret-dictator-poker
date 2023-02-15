import Players from "./Players"
import Player from '../Interface/Player'
import RNG from "./Rng"
import {Team} from "../Interface/Role"
import {getTeamString} from "../Render/SDUtils" 
import Actions from "./Actions"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Settings from "./Settings"
import ActionArgs from "../Interface/Action"
import {colorPolicy} from '../Render/SDUtils'
import settings from "./Settings"

let SpecialPhases = [
  //5,6
  [Phase.nominate, Phase.nominate, Phase.peak, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //7,8
  [Phase.nominate, Phase.investigate, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //9,10
  [Phase.investigate, Phase.investigate, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame]
]

let pCandidate: Player 
let cCandidate: Player | undefined
let president : Player | undefined
let chancellor: Player | undefined

let normalPCandidate: Player
let forcedPCandidate: Player | undefined

let lastElectedPresident: Player | undefined
let lastElectedChancellor: Player | undefined

let failCount = 0
let bribers : Player[]
let activeBriber : Player | undefined
let policyDeck : ("l" | "f")[] = []
let discard : ("l" | "f")[] = []
let activePolicies : ("l" | "f")[] = []
let lPassed = 0
let fPassed = 0
let initalized = false
let dictatorElected = false

export function initSD(){
  bribers = []
  forcedPCandidate = undefined
  failCount = 0
  activeBriber = undefined
  lPassed = 0
  fPassed = 0
  president = undefined
  chancellor = undefined
  lastElectedPresident = undefined
  lastElectedChancellor = undefined
  dictatorElected = false

  let players = Players.players
  if(players.length < 5) throw Error('not enough players to start secret dictator')
  let nFascist = Math.floor((players.length - 3) / 2)
  let teams : number[] = []
  players.forEach((_) => teams.push(Team.liberal))

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
    Actions.log({content: [p, ": " + Team[p.role.team]], visibleTo: Players.players.indexOf(p)})
  })
  pCandidate = players[RNG.nextInt(players.length)]
  normalPCandidate = pCandidate

  policyDeck = Array(Settings.getNumber("fPolicyCount")).fill("f").concat(Array(Settings.getNumber("lPolicyCount")).fill("l"))
  discard = []
  activePolicies = []
  //shuffles policyDeck
  RNG.randomize(policyDeck)
}

function getFascistPlayers(){
  return Players.getIndices(p => p.role.team !== Team.liberal)
}

function getDictator() : Player{
  return Players.filter(p => p.role.team === Team.dictator)[0]
}

function nextPCandidate(){
  if(forcedPCandidate){
    pCandidate = forcedPCandidate
    forcedPCandidate = undefined
  }
  else{
    let next = Players.nextLiving(normalPCandidate)
    if(next === false) {
      Actions.log("Nobody else is alive, the government fails")
      topCardToEnd()
    }
    else {
      normalPCandidate = Players.get(next)
      pCandidate = normalPCandidate
    }
  }
}

function topCardToEnd(){
  activePolicies = activePolicies.concat(policyDeck.concat(discard))
  while(Game.getPhase() !== Phase.endgame){
    passPolicy(0, true, false)
  }
}

Game.setPhaseListener(Phase.nominate, () => {
  let wasUninitialized = !initalized
  if(!initalized){
    initSD()
    initalized = true
  }
  nextPCandidate()

  Players.setActors(p => p === pCandidate)
  Players.apply(p => p.targetable = 
    (p !== pCandidate && p !== lastElectedPresident && 
     p !== lastElectedChancellor && p.bank > 0))
  if(failCount === 0){
    Players.apply(p => p.role.influence = p.bank)
  }
  
  if(!wasUninitialized && Players.filter(p => p.targetable).length === 0) {
    Actions.log([pCandidate, " has no legal chancellor choices. Their government fails."])
    failGovernment()
  }
})

Actions.register(Phase.nominate, (args : ActionArgs) => {
  if(args.t === undefined) return false
  let p = Players.get(args.t)
  cCandidate = p
  Actions.log([pCandidate, " nominates ", cCandidate])
  Game.setPhase(Phase.vote)
  return true
})

Game.setPhaseListener(Phase.vote, () => {
  Players.setActors(p => p.bank > 0)
  Players.apply(p => p.targetable = false)
  Players.apply(p => p.role.vote = undefined)
  Players.apply(p => p.role.spent = 0)
})

export function getVoteCost(n: number){
  const scaling = settings.getString("voteCostScaling")
  if(scaling === "1") return n
  else{
    let cost = 0
    for(let i = 1; i <= n; i++){
      if(scaling === "n^2") cost += i * i
      if(scaling === "2^n") cost += Math.pow(2, i - 1)
      if(scaling === "3^n") cost += Math.pow(3, i - 1)
    }
    return cost
  }
}

Actions.register(Phase.vote, (args: ActionArgs) => {
  let size = args.v
  let p = Players.get(args.p)
  if(!size) return false
  let bought = Math.floor(Math.abs(size))
  let cost = getVoteCost(bought)
  if(cost > p.role.influence) return false
  p.role.vote = size > 0
  p.role.spent = bought
  p.role.influence -= cost
  p.canAct = false
  Actions.log([p, " votes",{
    content: ": " + ["✔️", "❌"][p.role.vote ? 0 : 1] + bought,
    visibleTo: Players.players.indexOf(p)
  }])
  if(Players.allDoneActing()) checkVotes()
  return true
})

function checkVotes(){
  let alivePlayers = Players.filter(p => p.bank > 0)
  let spents = alivePlayers.map(p => p.role.spent)
  let votes = alivePlayers.map(p => p.role.vote)
  let yesSum = 0
  let noSum = 0
  if(settings.getString("showVoting") !== "Anonymous")
  Players.applyLiving(p => {
    let showVoting = Settings.getString("showVoting") 
    Actions.log([p, ': ' + ["✔️", "❌"][p.role.vote ? 0 : 1], 
      {
        content: ' ' + p.role.spent,
        visibleTo: showVoting !== "Value" && Players.players.indexOf(p)
      }
    ])
  })
  for(let i = 0; i < spents.length; i++){
    if(votes[i]) yesSum += spents[i] + Settings.getNumber("freeInfluence")
    else noSum += spents[i] + Settings.getNumber("freeInfluence")
  }
  Actions.log("✔️: " + yesSum)
  Actions.log("❌: " + noSum)
  if(yesSum > noSum){
    Actions.log("The vote passes")
    president = pCandidate
    chancellor = cCandidate
    lastElectedPresident = pCandidate
    lastElectedChancellor = cCandidate
    if(fPassed >= 3 && chancellor?.role.team === Team.dictator) {
      let dictatorWin = Settings.getString('dictatorWin')
      if(dictatorWin === "Classic"){
        Actions.log([chancellor, " is the dictator"])
        fascistWin()
      }
      else if(dictatorWin === "Dictator Election Required"){
        dictatorElected = true
        Actions.log({content: [chancellor, " is the dictator"], 
          visibleTo: getFascistPlayers()})
        Game.setPhase(Phase.bribe)
      }
    }
    else Game.setPhase(Phase.bribe)
  }
  else {
    Actions.log("The vote fails")
    failGovernment()
  }
}

function failGovernment(){
  if(failCount < 2){
    failCount++
    Game.setPhase(Phase.nominate)
  }
  else{
    lastElectedPresident = undefined
    lastElectedChancellor = undefined
    drawPolicies(1)
    passPolicy(0, true)
  }
}

Game.setPhaseListener(Phase.bribe, () => {
  Players.apply(p => p.role.spent = 0)
  Players.setActors(p => p !== president && p !== chancellor)
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
  Actions.log([p, " bribes", {
    content:  ": " + size,
    visibleTo: Players.players.indexOf(p)
  }])
  p.role.spent = size
  p.canAct = false
  if(president === undefined) throw Error("President is undefined in bribe phase")
  if(Players.allDoneActing()) {
    if(settings.getString("bribeInfo") === "Public Bribes" || settings.getString("bribeInfo") === "Show True Government"){
      Actions.log("Bribes: ")
      Players.applyLiving(p => {
        if(p.role.spent > 0) {
          Actions.log([p, ": " + size])
        }
      })
    }
    
    bribers = Players.filter(p => p !== president && p !== chancellor && p.role.spent > 0)
    RNG.randomize(bribers)
    bribers.sort((a,b) => b.role.spent - a.role.spent)
    if(bribers.length > 0){
      activeBriber = bribers[0]
      logBribeView(president, activeBriber)
      Game.setPhase(Phase.presBribe)
    }
    else{
      Game.setPhase(Phase.president)
    }
  }
  return true
})

function logBribe(gName: string, g: Player, b: Player, a: boolean){
  let stg = Settings.getString("bribeInfo") === "Show True Government"
  if(a){
    Actions.log(
      {
        content: [gName, " ", g, " accepts bribe of " + b.role.spent,
        {
          content: [" from " , b],
          visibleTo: !Settings.atLeast("bribeInfo", "On Acceptance") &&
          Players.players.indexOf(b)
        }],
        visibleTo: !stg && [Players.players.indexOf(g), Players.players.indexOf(b)]
      }
    )
  }
  else{
    Actions.log({content:[gName, " ", g, " declines bribe of " + b.role.spent + " from " , b],
    visibleTo: !stg && [Players.players.indexOf(g), Players.players.indexOf(b)]})
  }
}

function logBribeView(g: Player, b: Player){
  if(Settings.atLeast("bribeInfo", "Before Acceptance")){
    Actions.log({content: [
      g, " sees bribe of " + b.role.spent, " from ", b],
      visibleTo: !Settings.atLeast("bribeInfo","Public Bribes") && 
      Players.players.indexOf(g)
    })
  }
}

Game.setPhaseListener(Phase.presBribe, () => {
  Players.apply(p => p.targetable = false)
  Players.setActors(p => p === president)
})

Actions.register(Phase.presBribe, (ActionArgs) => {
  if(ActionArgs.v === undefined) return false
  if(!president) throw Error("President is undefined in presBribe phase")
  if(!activeBriber) throw Error("No briber found yet we are in presBribe phase")

  if(ActionArgs.v === 1){
    logBribe("President", president, activeBriber, true)
    activeBriber.role.influence -= activeBriber.role.spent
    pCandidate.role.influence += activeBriber.role.spent
    president = activeBriber
  }
  else{
    logBribe("President", president, activeBriber, false)
    president = Players.get(ActionArgs.p)
  }
  Game.setPhase(Phase.president)
  return true
})

function peakPolicies(n: number){
  if(policyDeck.length < n){
    discard = discard.concat(policyDeck)
    if(discard.length < n) throw Error("not enough policy choices left to reshuffle: " + discard)
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
  if(president === undefined) throw Error("President is undefined during president phase")
  Actions.log("The president draws 3 policies")
  printPolicies([president, " sees: "], activePolicies, president)
  Players.apply(p => p.targetable = false)
  Players.setActors(p => p === president)
})

Actions.register(Phase.president, (args: ActionArgs) => {
  let v = args.v
  if(v === undefined || v < 0 || v >= activePolicies.length) return false
  discard = discard.concat(activePolicies.splice(v,1))
  if(president === undefined) throw Error("President is undefined during president phase")
  if(chancellor === undefined) throw Error("Chancellor is undefined during president phase")
  Actions.log("The president discards a policy")
  printPolicies([president, " sends "], activePolicies, [president])
  if(bribers.length > 0 && activeBriber === president){
    bribers.splice(0,1)
  }
  if(bribers.length > 0){
    activeBriber = bribers[0]
    logBribeView(chancellor, activeBriber)
    Game.setPhase(Phase.chanBribe)
  }
  else{
    Game.setPhase(Phase.chancellor)
  }
  return true
})

Game.setPhaseListener(Phase.chanBribe, () => {
  Players.apply(p => p.targetable = false)
  Players.setActors(p => p === chancellor)
})

Actions.register(Phase.chanBribe, (ActionArgs) => {
  if(ActionArgs.v === undefined) return false
  if(!activeBriber) throw Error("No briber found yet we are in chanBribe phase")
  if(!cCandidate) throw Error("No cCanidate found yet we are in chanBribe phase")
  if(ActionArgs.v === 1){
    logBribe("Chancellor", cCandidate, activeBriber, true)
    chancellor = activeBriber
    activeBriber.role.influence -= activeBriber.role.spent
    cCandidate.role.influence += activeBriber.role.spent
  }
  else{
    logBribe("Chancellor", cCandidate, activeBriber, false)
    chancellor = Players.get(ActionArgs.p)
  }
  Game.setPhase(Phase.chancellor)
  return true
})

Game.setPhaseListener(Phase.chancellor, () => {
  Players.setActors(p => p === chancellor)
  if(chancellor === undefined) throw Error("Chancellor is undefined during chancellor phase")
  Actions.log("The chancellor recieves 2 policies")
  printPolicies([chancellor, " sees: "], activePolicies, chancellor)
})

Actions.register(Phase.chancellor, (args: ActionArgs) => {
  if(args.v === undefined) return false
  if(chancellor === undefined) throw Error("Chancellor is undefined during chancellor phase")
  if(args.v === -1) {
    Game.setPhase(Phase.veto)
    Actions.log(["The chancellor vetoes the policies"])
  }
  else {
    Actions.log(["The chancellor passes ", colorPolicy(activePolicies[args.v])])
    passPolicy(args.v)
  }
  return true
})

// function printGov(){
//   if(settings.getString("bribeInfo") === "Show True Government"){
    
//   }
// }

function passPolicy(a: number, topCard = false, exit = true){
  if(a < 0 || a >= activePolicies.length) return false
  let policy = activePolicies.splice(a,1)[0]
  if(!topCard && (pCandidate === undefined || cCandidate === undefined)){
    throw Error("pCandidate or cCandidate is undefined while passing policy")
  } 
  if(policy === "l"){
    if(topCard) Actions.log(["Top card is liberal"])
    else {
      Actions.log(["\"", pCandidate, "\"", " and ", "\"", cCandidate as Player, "\"", " have passed a liberal policy"])
      if(settings.getString("bribeInfo") === "Show True Government") Actions.log(["Shadow government: ", pCandidate, " => ", cCandidate as Player])
    }
    lPassed++
    if(lPassed === 5){
      liberalWin()
    }
    else{
      Players.applyLiving(p => p.role.influence += Settings.getNumber("ecoBase"))
      if(exit){
        exitSD()
      }
    }
  }
  else if(policy === "f"){
    if(topCard) Actions.log(["Top card is fascist"])
    else {
      Actions.log(["\"", pCandidate, "\"", " and ", "\"", cCandidate as Player, "\"", " have passed a fascist policy"])
      if(settings.getString("bribeInfo") === "Show True Government") 
        Actions.log(["Shadow government: ", pCandidate, " → ", 
        cCandidate as Player])
    }
    let special = getSpecialPhase(fPassed++)
    if(special === Phase.endgame){
      let dictatorWin = Settings.getString("dictatorWin")
      if(dictatorWin === "Dictator Election Required" && !dictatorElected){
        special = Phase.assassinate
      }
      else{
        fascistWin()
      }
    } 
    if(topCard || special === Phase.nominate) {
      if(exit) exitSD()
    }
    else if(exit) Game.setPhase(special)
  }
}

Game.setPhaseListener(Phase.assassinate, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president && p.bank > 0)
})

Actions.register(Phase.assassinate, (args: ActionArgs) => {
  if(args.t === undefined) return false
  let t = Players.get(args.t)
  t.bank = 0
  t.role.influence = 0
  Actions.log(["\"", pCandidate, "\"", " assassinates ", t])
  Players.updateBanks(p => p.bank)
  if(Game.getPhase() !== Phase.endgame) exitSD()
  return true
})

Game.setPhaseListener(Phase.investigate, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president)
})

Actions.register(Phase.investigate, (args: ActionArgs) => {
  if(args.t === undefined) return false
  Players.get(args.p).role.vision.push(Players.get(args.t))
  Players.get(args.p).bankVision.push(Players.get(args.t))
  Actions.log(["\"", pCandidate, "\"", " investigates ", Players.get(args.t)])
  Actions.log({content: [Players.get(args.t), " is ", 
    getTeamString({u: Players.get(args.p), p: Players.get(args.t), inEndgame: false})],
    visibleTo: args.p})
  exitSD()
  return true
})

function printPolicies(label: string | (string | Player)[], policies: ("l" | "f")[], p: Player | Player[] | undefined){
  if(!(p instanceof Array)) {
    if(p === undefined) throw Error("printPolicies called with undefined player")
    p = [p]
  }
  let pIndicies = (p as Player[]).map(pl => Players.players.indexOf(pl))
  let pels = policies.map(colorPolicy).map(x => {return {content: x, visibleTo: 
    pIndicies
  }})

  if(Array.isArray(label)) Actions.log({content: [...label, ...pels], visibleTo: pIndicies})
  else Actions.log({content: [label, ...pels], visibleTo: pIndicies})
}

Game.setPhaseListener(Phase.peak, () => {
  Players.setActors(p => p === president)
  Actions.log("The president peaks at the next 3 policies")
  printPolicies("Next 3 Policies: ", peakPolicies(3), president)
})

Actions.register(Phase.peak, (args: ActionArgs) => {
  Actions.log(["\"", pCandidate, "\"", " peaks at the next 3 policies"])
  exitSD()
  return true
})

Game.setPhaseListener(Phase.pickPres, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president && p.bank > 0)
})

Actions.register(Phase.pickPres, (args: ActionArgs) => {
  if(args.t === undefined) return false
  forcedPCandidate = Players.get(args.t)
  Actions.log([forcedPCandidate, " selected as next presidential candidate"])
  exitSD()
  return true
})

Game.setPhaseListener(Phase.veto, () => {
  Players.setActors(p => p === president)
})

Actions.register(Phase.veto, (args: ActionArgs) => {
  if(chancellor === undefined || cCandidate === undefined) throw Error("no chancellor exists during veto phase")
  if(args.v === 1){
    Actions.log(["\"", pCandidate, "\"", " and ", "\"", cCandidate, "\"", " have vetoed their policy choices"])
    failGovernment()
    return true
  }
  else if(args.v === 0){
    if(president === undefined) throw Error("Error: no president exists during veto phase")
    Actions.log(["\"", pCandidate, "\"", " refuses the veto."])
    Game.setPhase(Phase.chancellor)
    return true
  }
  return false
})

Game.setPhaseListener(Phase.endgame, () => {
  Players.apply(p => p.targetable = false)
  Players.setActors(p => false)
})

function loot(w: Player[], l: Player[]){
  const lSum = l.map(p => p.bank).reduce((a,b) => a+b)
  if(w.length > 0){
    l.forEach(p => p.bank = Math.floor(p.bank / 2))
  }
  w.forEach(p => p.bank += Math.floor(lSum / w.length / 2))
}

function liberalWin(){
  const fascists = Players.filter(p => p.role.team !== Team.liberal)
  const liberals = Players.filter(p => p.role.team === Team.liberal && p.bank > 0)
  loot(liberals, fascists)
  Actions.log("Liberals Win")
}

function fascistWin(){
  const fascists = Players.filter(p => p.role.team !== Team.liberal && p.bank > 0)
  const liberals = Players.filter(p => p.role.team === Team.liberal)
  loot(fascists, liberals)
  Actions.log("Fascists Win")
}

function doesDictatorDeathEndGame(){
  let dictatorWin = Settings.getString("dictatorWin")
  if(dictatorWin === "Classic") return true
  else if(dictatorWin === "No Dictator Win") return false
  else return !dictatorElected
}

Players.onBankUpdate = () => {
  let aliveLiberalCount = Players.filter(p => p.role.team === Team.liberal &&
    p.bank > 0).length
  let aliveFascistCount = Players.filter(p => p.role.team !== Team.liberal &&
    p.bank > 0).length
  let dictatorAlive = getDictator().bank > 0

  let libWin = aliveFascistCount === 0 || (!dictatorAlive && doesDictatorDeathEndGame())
  let fasWin = aliveLiberalCount === 0
  if(libWin || fasWin){
    if(!fasWin) liberalWin()
    else if(!libWin) fascistWin()
    else Actions.log("A Draw has Occured.")
    exitSD(Phase.endgame, false)
  }
}

function exitSD(phase = Phase.poker, ub: boolean = true){
  cCandidate = undefined
  discard = discard.concat(activePolicies)
  activePolicies = []
  failCount = 0
  if(ub) Players.updateBanks(p => p.role.influence)
  Game.setPhase(phase)
}

Actions.onReset.push(() => {initalized = false})

export function getSpecialPhase(n: number) : Phase{
  let playerLength = Players.players.length
  return SpecialPhases[Math.floor((playerLength - 5) / 2)][n] || Phase.endgame
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
    peakPolicies: policyDeck.slice(0,3),
    dictatorElected: dictatorElected
  }
}

export function setFPassed(n: number){
  fPassed = n
}

export function setLPassed(n: number){
  lPassed = n
}