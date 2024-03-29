import {Notifier} from "../Render/RenderNotificationText"
import Players from "./Players"
import Player from '../Interface/Player'
import RNG from "./Rng"
import {Team} from "../Interface/Role"
import {getTeamString} from "../Render/SDUtils" 
import Actions from "./Actions"
import Phase from "../Interface/Phase"
import Game from "./Game"
import Settings, { gameMode } from "./Settings"
import ActionArgs from "../Interface/Action"
import {colorPolicy} from '../Render/SDUtils'
import settings from "./Settings"
import Policy from "../Interface/Policy"
import { postPokerHooks } from "./Poker"

let SpecialPhases = [
  //5,6
  [Phase.nominate, Phase.nominate, Phase.peak, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //7,8
  [Phase.nominate, Phase.investigate, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame],
  //9,10
  [Phase.investigate, Phase.investigate, Phase.pickPres, Phase.assassinate, Phase.assassinate, Phase.endgame]
]

let SDPhases = [Phase.assassinate, Phase.bribe, Phase.chanBribe, Phase.chancellor,
  Phase.investigate, Phase.nominate, Phase.peak, Phase.president, Phase.presBribe,
 Phase.pickPres, Phase.veto, Phase.vote]


export interface SDLogElement {
  p?: Player,
  c?: Player,
  v?: Map<Player, number>,
  r?: Policy,
  a?: Phase
}

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
let policyDeck : Policy[] = []
let discard : Policy[] = []
let activePolicies : Policy[] = []
let lPassed = 0
let fPassed = 0
let libertarianPassed = 0
let bpPassed = 0
let initalized = false
let dictatorElected = false
let vetoOverriden = false
let votePool = 0
export let sdlog = {log: [] as SDLogElement[]}


export function initSD(){
  bribers = []
  forcedPCandidate = undefined
  failCount = 0
  activeBriber = undefined
  lPassed = 0
  fPassed = 0
  libertarianPassed = 0
  bpPassed = 0
  president = undefined
  chancellor = undefined
  lastElectedPresident = undefined
  lastElectedChancellor = undefined
  dictatorElected = false
  sdlog.log = []
  vetoOverriden = false
  votePool = 0

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
  Players.onKill = onKill
  pCandidate = players[RNG.nextInt(players.length)]
  normalPCandidate = pCandidate

  policyDeck = Array(Settings.getNumber("fPolicyCount")).fill(Policy.fascist)
    .concat(Array(Settings.getNumber("lPolicyCount")).fill(Policy.liberal))
    .concat(Array(Settings.getNumber("libertarianPolicyCount")).fill(Policy.libertarian))
    .concat(Array(Settings.getBool("bloodPact") ? 1 : 0).fill(Policy.bp)) 
  discard = []
  activePolicies = []
  //shuffles policyDeck
  RNG.randomize(policyDeck)
}

postPokerHooks.hooks.push({
  priority: 0,
  hook: (n: number) => {
    if(gameMode() !== "P" && !(n % Settings.getNumber("pokerHands"))){
      return Game.setPhase(Phase.nominate)
    }
    return false
  }
})

function getFascistPlayers(){
  return Players.getIndices(p => p.role.team !== Team.liberal)
}

function getDictator() : Player{
  return Players.filter(p => p.role.team === Team.dictator)[0]
}

function startBribePhase(){
  if(gameMode() === "SDP"){
    Game.setPhase(Phase.bribe)
  }
  else{
    president = pCandidate
    chancellor = cCandidate
    Game.setPhase(Phase.president)
  }
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
  vetoOverriden = false
  if(!initalized){
    initSD()
    initalized = true
  }
  nextPCandidate()

  Players.setActors(p => p === pCandidate)
  Players.apply(p => p.targetable = 
    (p !== pCandidate && p !== lastElectedPresident && 
     p !== lastElectedChancellor && !p.dead))
  if(failCount === 0){
    Players.apply(p => p.role.influence = p.bank)
  }
  
  if(!wasUninitialized && Players.filter(p => p.targetable).length === 0) {
    Actions.log([pCandidate, " has no legal chancellor choices. Their government fails."])
    failGovernment()
  }
})

Actions.register(Phase.nominate, (args : ActionArgs) => {
  cCandidate = playerObj(args.t)
  Actions.log([pCandidate, " nominates ", cCandidate])
  sdlog.log.push({p: pCandidate, c: cCandidate})
  Game.setPhase(Phase.vote)
  return true
})

Game.setPhaseListener(Phase.vote, () => {
  Players.setActors(p => !p.dead)
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
  let size = args.v ? args.v : (RNG.nextInt(2) === 0 ? 0.5 : -0.5) 
  //default to no vote
  let p = Players.get(args.p)
  if(!size) return false
  let bought = Math.floor(Math.abs(size))
  let cost = getVoteCost(bought)
  if(cost > p.role.influence) return false
  p.role.vote = size > 0
  p.role.spent = bought
  p.role.influence -= cost
  votePool += cost
  Players.setActors(pl => pl.canAct && pl !== p, true, true)
  Actions.log([p, " votes",{
    content: ": " + ["✔️", "❌"][p.role.vote ? 0 : 1] + (bought ? bought : ""),
    visibleTo: Players.players.indexOf(p)
  }])
  if(Players.allDoneActing()) checkVotes()
  return true
})


function mapPlayerVotes(){
  let alivePlayers = Players.filter(p => !p.dead)
  let voteMap = new Map<Player, number>()
  alivePlayers.forEach(p => voteMap.set(p, (p.role.vote ? 1 : -1) * (p.role.spent + 
    Settings.getNumber("freeInfluence"))))
  return voteMap
}

export let onCheckVotes = {
  hooks: []
} as {hooks: (() => void)[]}

function checkVotes(){
  let alivePlayers = Players.filter(p => !p.dead)
  Players.distribute(votePool, (p, n) => p.role.influence += n)
  votePool = 0
  for(let hook of onCheckVotes.hooks) hook() //for BP
  sdlog.log[sdlog.log.length - 1].v = mapPlayerVotes()
  let spents = alivePlayers.map(p => p.role.spent)
  let votes = alivePlayers.map(p => p.role.vote)
  let yesSum = 0
  let noSum = 0
  if(settings.getString("showVoting") !== "Anonymous")
  Players.applyLiving(p => {
    let showVoting = Settings.getString("showVoting") 
    Actions.log([p, ': ' + ["✔️", "❌"][p.role.vote ? 0 : 1], 
      gameMode() !== 'SD' &&
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
  if(yesSum > noSum && pCandidate && !pCandidate.dead && cCandidate && 
    !cCandidate.dead){
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
          if(fPassed < 6)
            startBribePhase()
          else
            fascistWin()
      }
    }
    else startBribePhase()
  }
  else {
    if(!pCandidate || pCandidate.dead){
      Actions.log("The president died during the voting process (what a nerd).")
    }
    if(!cCandidate || cCandidate.dead){
      Actions.log("The chancellor died during the voting process (haha, oops!).")
    }
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
  let size = ActionArgs.v ? ActionArgs.v : 0
  let p = Players.get(ActionArgs.p)
  if(size < 0 || size > p.role.influence) return false
  Actions.log([p, " bribes", {
    content:  ": " + size,
    visibleTo: Players.players.indexOf(p)
  }])
  p.role.spent = size
  Players.setActors(pl => pl.canAct && pl !== p, true, true)
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
  let bribeAccepted = ActionArgs.v
  if(!president) throw Error("President is undefined in presBribe phase")
  if(!activeBriber) throw Error("No briber found yet we are in presBribe phase")

  if(bribeAccepted){
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
  if(v === undefined){
    v = 0
    console.warn("Defualt president policy choice invoked, first card discarded")
  }
  if(v < 0 || v >= activePolicies.length) return false
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
  let bribeAccepted = ActionArgs.v
  if(!activeBriber) throw Error("No briber found yet we are in chanBribe phase")
  if(!cCandidate) throw Error("No cCanidate found yet we are in chanBribe phase")
  if(bribeAccepted){
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
  let v = args.v
  if(v === undefined){
    v = 0 
    console.warn("Defualt chancellor policy choice invoked, first card passed")
  }
  if(chancellor === undefined) throw Error("Chancellor is undefined during chancellor phase")
  if(args.v === -1) {
    if(vetoOverriden) return false
    Game.setPhase(Phase.veto)
    Actions.log(["The chancellor vetoes the policies"])
  }
  else {
    Actions.log(["The chancellor passes ", colorPolicy(activePolicies[v])])
    passPolicy(v)
  }
  return true
})

function passPolicy(a: number, topCard = false, exit = true){
  if(a < 0 || a >= activePolicies.length) return false
  let policy = activePolicies.splice(a,1)[0]
  if(topCard){
    sdlog.log.push({r: policy})
  }
  else{
    sdlog.log[sdlog.log.length - 1].r = policy
  }
  if(!topCard && (pCandidate === undefined || cCandidate === undefined)){
    throw Error("pCandidate or cCandidate is undefined while passing policy")
  }
  let policyLogStr = {
    [Policy.liberal]: "liberal",
    [Policy.fascist]: "fascist",
    [Policy.libertarian]: "libertarian",
    [Policy.bp]: "Xar' ah"
  }[policy]
  if(topCard) Actions.log(["Top card is ", policyLogStr])
  else {
    Actions.log(["\"", pCandidate, "\"", " and ", "\"", cCandidate as Player,
     "\"", " have passed a ", policyLogStr, " policy"])
    if(settings.getString("bribeInfo") === "Show True Government") 
      Actions.log(["Shadow government: ", pCandidate, " => ",
        cCandidate as Player])
  }
  if(policy === Policy.liberal){
    lPassed++
    if(lPassed === 5) liberalWin()
    else if(exit) exitSD()
  }
  else if(policy === Policy.fascist){
    let special = getSpecialPhase(fPassed++)
    if(special === Phase.endgame){
      let dictatorWin = Settings.getString("dictatorWin")
      if(dictatorWin === "Dictator Election Required" && !dictatorElected){
        special = Phase.assassinate
      }
      else{
        fascistWin()
        return
      }
    } 
    if(topCard || special === Phase.nominate) {
      if(exit) exitSD()
    }
    else if(exit) Game.setPhase(special)
  }
  else if(policy === Policy.libertarian){
    libertarianPassed++
    let blindStr = "big blind"
    let total = Settings.getNumber("BB") * (2 * libertarianPassed + 1)
    if(Settings.getString("pokerType") === "7 Card STud"){
      blindStr = "small bet"
      total = Settings.getNumber("bet") * (2 * libertarianPassed + 1)
    }
    Notifier.notify("A libertarian policy has been passed. \n The " + blindStr 
    + " has increased to " + total)
    if(exit) exitSD()
  }
  else if(policy === Policy.bp){
    bpPassed++
    Notifier.customNotify({
      s: "You feel an intrinsic sense of decay... as if " + 
      "an essential part of you has withered away forever. The boundry " + 
      "between our world and the domain of Xar' Ah the great devourer " +
      "has been breached. This may have a serious effect on your " + 
      "credit score.", 
      timeout: 10000})
    if(exit) exitSD()
  }
}
/*
 * Returns the player at the specified index, or defaults to a random player
 */
function playerObj(player? : number){
  if(player === undefined){
    console.warn("Default action used in targeting phase! Picking random player.")
    let eligible = Players.filter(p => p.targetable)
    return eligible[RNG.nextInt(eligible.length)]
  }
  else{
    return Players.get(player)
  }
}

Game.setPhaseListener(Phase.assassinate, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president && !p.dead)
})

Actions.register(Phase.assassinate, (args: ActionArgs) => {
  let t = playerObj(args.t)
  sdlog.log.push({
    p: pCandidate,
    c: t,
    a: Phase.assassinate
  })
  Actions.log(["\"", pCandidate, "\"", " assassinates ", t])
  t.dead = true
  Players.updateBanks(p => p.role.influence)
  if(Game.getPhase() !== Phase.endgame) exitSD()
  return true
})

Game.setPhaseListener(Phase.investigate, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president)
})

Actions.register(Phase.investigate, (args: ActionArgs) => {
  let t = playerObj(args.t)
  Players.get(args.p).role.vision.push(t)
  Players.get(args.p).bankVision.push(t)
  sdlog.log.push({
    p: pCandidate,
    c: t,
    a: Phase.investigate
  })
  Actions.log(["\"", pCandidate, "\"", " investigates ", t])
  Actions.log({content: [t, " is ", 
    getTeamString({u: Players.get(args.p), p: t, inEndgame: false})],
    visibleTo: args.p})
  exitSD()
  return true
})

function printPolicies(label: string | (string | Player)[], policies: Policy[], p: Player | Player[] | undefined){
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
  sdlog.log.push({
    p: pCandidate,
    a: Phase.peak
  })
  exitSD()
  return true
})

Game.setPhaseListener(Phase.pickPres, () => {
  Players.setActors(p => p === president)
  Players.apply(p => p.targetable = p !== president && !p.dead)
})

Actions.register(Phase.pickPres, (args: ActionArgs) => {
  forcedPCandidate = playerObj(args.t)
  Actions.log([forcedPCandidate, " selected as next presidential candidate"])
  sdlog.log.push({
    p: pCandidate,
    c: forcedPCandidate,
    a: Phase.pickPres
  })
  exitSD()
  return true
})

Game.setPhaseListener(Phase.veto, () => {
  Players.setActors(p => p === president)
})

Actions.register(Phase.veto, (args: ActionArgs) => {
  let vetoed = args.v
  if(chancellor === undefined || cCandidate === undefined) throw Error("no chancellor exists during veto phase")
  if(vetoed){
    Actions.log(["\"", pCandidate, "\"", " and ", "\"", cCandidate, "\"", " have vetoed their policy choices"])
    failGovernment()
    return true
  }
  else if(vetoed){
    if(president === undefined) throw Error("Error: no president exists during veto phase")
    Actions.log(["\"", pCandidate, "\"", " refuses the veto."])
    vetoOverriden = true
    Game.setPhase(Phase.chancellor)
    return true
  }
  return false
})

Game.setPhaseListener(Phase.endgame, () => {
  Players.apply(p => p.targetable = false)
  Players.setActors(_ => false)
})

export function loot(w: Player[], l: Player[], rat: number = 0.5,
                    gBank = (p: Player) => p.bank, sBank = (p: Player, n: number) => p.bank = n){
  if(gameMode() === "SD"){
    l.forEach(p => sBank(p, 0))
    w.forEach(p => sBank(p, 1))
  }
  else{
    let totalLooted = l.map(p => Math.ceil(gBank(p) * rat)).reduce((a,b) => a+b)
    if(w.length > 0){
      l.forEach(p => sBank(p, Math.floor(gBank(p) * (1 - rat))))
    }
    Players.distribute(totalLooted, (p, n) => sBank(p, gBank(p) + n),
      p => w.includes(p))
  }
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

function doesDictatorDeathEndGame(){
  let dictatorWin = Settings.getString("dictatorWin")
  if(dictatorWin === "Classic") return true
  else if(dictatorWin === "No Dictator Win") return false
  else return !dictatorElected
}

function onKill() {
  let aliveLiberalCount = Players.filter(p => p.role.team === Team.liberal &&
    !p.dead).length
  let aliveFascistCount = Players.filter(p => p.role.team !== Team.liberal &&
    !p.dead).length
  let dictatorAlive = !getDictator().dead

  let libWin = aliveFascistCount === 0 || (!dictatorAlive && doesDictatorDeathEndGame())
  let fasWin = aliveLiberalCount === 0
  if(libWin || fasWin){
    if(!fasWin) liberalWin()
    else if(!libWin) fascistWin()
    else Actions.log("A Draw has Occured.")
  }
}

function exitSD(phase = Phase.poker, ub: boolean = true){
  cCandidate = undefined
  discard = discard.concat(activePolicies)
  activePolicies = []
  failCount = 0
  if(ub) Players.updateBanks(p => p.role.influence)
  if(phase !== Phase.poker || gameMode() === "SDP") Game.setPhase(phase)
  else Game.setPhase(Phase.nominate)
}

for(let p of SDPhases){
  if([Phase.president, Phase.chancellor].includes(p)) continue
  Game.setPhaseTimer(p, () => Settings.getBool("sdTimed") ? 
    Settings.getNumber("sdTime") : 0)
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
    libertarianPassed: libertarianPassed,
    bpPassed: bpPassed,
    pCandidate: pCandidate,
    president: president,
    bg: Math.floor(240 + (5 - lPassed) / (11 - lPassed - fPassed)  * 120),
    activeBriber: activeBriber,
    activePolicies: activePolicies,
    peakPolicies: policyDeck.slice(0,3),
    dictatorElected: dictatorElected,
    vetoOverriden: vetoOverriden,
  }
}

export function setFPassed(n: number){
  fPassed = n
}

export function setLPassed(n: number){
  lPassed = n
}

export function inSD(){
  return Game.getPhase() !== Phase.poker && Game.getPhase() !== Phase.endgame
}
