import {getCardString, renderNet} from '../Render/PokerUtils'
import ActionArgs from "../Interface/Action"
import Actions from "./Actions"
import Game from "./Game"
import Phase from "../Interface/Phase"
import Player from './../Interface/Player'
import Players from './Players'
import Rng from "./Rng"
import Settings, { gameMode } from "./Settings"

//Hand types:
//Card represented as 0 to 51
//Suit is: CDSH in ascending groups of 13
//value is 0 -> 2, 1 - > 3,..., 12 -> A
//1 HC - 13^4 * highest card + 13^3 * second highest + ... + lowest card
//2 Pair - 13^3 * pair + 13^2 * kicker + 13 * second kicker + 13 * lowest 
//3 2 pair - 13^2 * high pair ...
//4 3 of a kind 
//5 straight - highest card
//6 flush - same as HC
//7 full house ...
//8 four of a kind ... 
//9 straight flush - highest card

/*
 * Returns the score of the best 5 card subset from the given list of cards
 */
function getCardsScore(cards: number[]): number{
  let flush = null
  let sv = 0
  let c = 13 ** 5
  if(cards.length >= 5){
    flush = getBestFlushHand(cards)
    if(flush !== null){
      let svf = getStraightValue(flush)
      if(svf > 0) return c * 8 + svf //straight flush
    }
    sv = getStraightValue(cards)
  }
  let nm = getNumberMatches(cards)
  let nmhs = getNMHandScore(nm)
  if(nm[0][0] === 4) return c * 7 + nmhs //quads
  if(nm[0][0] === 3 && nm[1] && nm[1][0] === 2) return c * 6 + nmhs //FH
  if(flush != null) return c * 5 + nmhs //flush
  if(sv > 0) return c * 4 + sv; //straight
  if(nm[0][0] === 3 && nm[1] && nm[1][0] === 1) return c * 3 + nmhs
  if(nm[0][0] === 2 && nm[1] && nm[1][0] === 2) return c * 2 + nmhs
  if(nm[0][0] === 2) return c + nmhs
  return nmhs
}

function getStraight(cards: number[]): number[] {
  let sv = getStraightValue(cards)
  if(sv > 0) {
    let straight : number[] = []
    for(let i = 0; i < 5; i++){
      straight.push(cards.filter(c => c % 13 === sv - 4 + i || ((sv - 4 + i === -1) && 
        c % 13 === 12))[0])
    }
    return straight.sort((a,b) => a % 13 - b % 13)
  }
  return  []
}

function orderBestHand(cards: number[]): number[] {
  let nm = getNumberMatches(cards)
  let bestHand : number[] = []
  for(let m of nm){
    for(let c of cards){
      if (c % 13 === m[1]) bestHand.push(c)
    }
  }
  //If we are worse than full house
  if(cards.length >= 5 && (nm[0][0]< 3 || (nm[0][0] === 3 && nm[1][0] < 2))){
    let flush = getBestFlushHand(cards)
    if(flush !== null){
      let svf = getStraightValue(flush)
      if(svf > 0) return getStraight(flush)
      else return flush.sort().reverse().slice(0, 5)
    }
    let sv = getStraightValue(cards)
    if(sv > 0) return getStraight(cards)
  }
  if(getCardsScore(bestHand) !== getCardsScore(cards)) 
    console.warn("orderBestHand score incosistent with getCardsScore - there is a bug with one")
  return bestHand
}

function getScoreString(score: number) : string{
  let c = 13 ** 5
  return ["Straight Flush", "Four of a Kind", "Full House", "Flush", "Straight",
   "Three of a Kind","Two Pair", "Pair", "High Card"][8 - Math.floor(score / c)]
}
function getNMHandScore(nm: number[][]) : number{
  let score = 0
  for(let i = 0; i < nm.length; i++){
    score += nm[i][1] * (13 ** (nm.length - i - 1))
  }
  return score
}
function getStraightValue(cards: number[]){
  let nums = Array(13).fill(0)
  for(let i = 0; i < cards.length; i++){
    nums[cards[i] % 13]++
  }
  let streak = 0
  let score = 0
  if(nums[12] > 0) streak++
  for(let i = 0; i < 13; i++){
    if(nums[i] > 0) streak++
    else streak = 0
    if(streak >= 5) score = i;
  }
  return score;
}
function getBestFlushHand(cards: number[]){
  let suitCounts = Array(4)
  for(let i = 0; i < 4; i++) suitCounts[i] = []
  for(const i of cards) suitCounts[Math.floor(i / 13)].push(i);
  let maxArray = [];
  for(const a of suitCounts){ //STOPPING POINT
    if(maxArray.length < a.length){
      maxArray = a;
    }
  }
  if(maxArray.length < 5) return null;
  maxArray.sort((a:number,b:number) => b-a)
  return maxArray
}
function getNumberMatches(cards: number[]): number[][]{
  let nums = Array(13).fill(0)
  for(let i = 0; i < cards.length; i++){
    nums[cards[i] % 13]++
  }
  let cardsLeft = Math.min(5, cards.length)
  let pairs: number[][] = []
  let n = 5
  while(n > 0){
    for(let j = 12; j >= 0; j--){
      if(nums[j] >= n){
        pairs.push([n, j])
        nums[j] = 0
        cardsLeft -= n
        if(n > cardsLeft){
          n = cardsLeft
          break
        }
      }
      if(j === 0) n--
    }
  }
  return pairs;
}

function getRandomDeck() : number[]{
  let sortedDeck: number[] = []
  for(let i = 0; i < 52; i++){
    sortedDeck.push(i)
  }
  for(let i = 0; i < 1000; i++){
    let a = Math.floor(Rng.nextInt(52))
    let b = Math.floor(Rng.nextInt(52))
    let temp = sortedDeck[a]
    sortedDeck[a] = sortedDeck[b]
    sortedDeck[b] = temp
  }
  return sortedDeck
}

let dealer: number = 0
let forced: Player[]
//decision maker
let dm: number | false = 0
let pot: number 
let maxAmtIn: number
let minRaise: number
/*
 * NLHE / PLO: 0 = preflop, 1 = flop, 2 = turn, 3 = river
 * 7 Stud: 0 = 3rd, 1 = 4th, 2 = 5th, 3 = 6th, 4 = 7th
 * 5 Draw: 0 = Initial, 1 = post draw
 */
let street: number
let center: number[]
let deck: number[]
let leftOver: number = 0
let handCount: number = 0

let BB = Settings.getNumber("BB")


Actions.onReset.push(() => {
  dealer = 0
  dm = 0
  pot = 0
  maxAmtIn = 0
  minRaise = 0
  street = 0
  center = []
  deck = getRandomDeck()
  leftOver = 0
  initialized = false
  handCount = 0
  forced = []
})


function startHand() : void{
  if(!initialized) initPoker()
  Players.apply(p => {
    p.targetable = false
    p.curHand.stack = p.bank
  })
  pot = 0
  maxAmtIn = 0
  minRaise = BB
  street = 0
  center = []
  deck = getRandomDeck()
  forced = []

  updateDealer()
  Players.apply(preparePlayer)
  setDM(Players.nextLiving(dealer))
  if(dm !== false){
    if(!isStud()){
      bet(Players.get(dm), Math.floor(BB/2), true)
      bet(Players.get(dm), BB, true)
    }
    else{
      let temp = dm
      do{
        bet(Players.get(dm), Settings.getNumber("ante"), true)
      }while(dm !== temp)
      setDM(Players.argMin((p) => p.curHand.upHand[0] % 13 * 100 + p.curHand.upHand[0])
      )
    }
  } 
  else{
    Game.setPhase(Phase.endgame)
  }
}

Game.setPhaseListener(Phase.poker, startHand)
Game.setPhaseTimer(Phase.poker, () => Settings.getBool("pokerTimed") ? 
  Settings.getNumber("pokerTime") : 0)

function setDM(newDM : number | false){
  Players.setActive(newDM)
  dm = newDM
  return dm
}

function dealIndividual(up: boolean, n: number = 1) : void{
  let inPlayers = Players.filter(p => !p.curHand.folded && p.bank > 0)
  if(inPlayers.length + (4 - street) > deck.length){
    Actions.log("Not enough cards left in deck - dealing in center")
    dealCenter(n, true)
    return
  }
  for(let i = 0; i < inPlayers.length; i++){
    let cards = []
    for(let i = 0; i < n; i++) cards.push(deck.pop() as number)
    if(up) {
      Actions.log([inPlayers[i], ": ", ...cards.map(getCardString)])
      inPlayers[i].curHand.upHand.push(...cards)
    }
    else {
      Actions.log({content: [inPlayers[i], ": ", ...cards.map(getCardString)], visibleTo: i})
      inPlayers[i].curHand.hand.push(...cards)
    }
  }
}

function nextStreet(log = true) : void{
  maxAmtIn = 0
  minRaise = BB
  if(!isStud()){
    if(street < 3){
      street++
      dealCenter(street === 1 ? 3 : 1, log)
    }
    else{
      endHand(log)
    }
  }
  else{
    Actions.log((street + 3) + "th Street: ")
    if(street < 3){
      street++
      dealIndividual(true)
    }
    else if(street === 3){
      dealIndividual(false)
      street++
    }
    else{
      endHand(log)
    }
  }
}

function getHand(p: Player){
  let variant = Settings.getString("pokerType")
  if(variant === "Texas Hold'em"){
    return orderBestHand(p.curHand.hand.concat(center))
  }
  else if(variant === "Omaha"){
    let maxScore = 0
    let maxHand : number[] = []
    //ok listen it's only 60 iterations plz don't judge me
    for(let i = 0; i < p.curHand.hand.length; i++){
      for(let j = i + 1; j < p.curHand.hand.length; j++){
        for(let k = 0; k < center.length; k++){
          for(let l = k + 1; l < center.length; l++){
            for(let m = l + 1; m < center.length; m++){
              let h = [p.curHand.hand[i], p.curHand.hand[j], center[k], center[l], center[m]]
              let score = getCardsScore(h)
              if(score > maxScore) {
                maxScore = score
                maxHand = h
              }
            }
          }
        }
      }
    }
    return orderBestHand(maxHand)
  }
  else{
    return orderBestHand(p.curHand.hand.concat(p.curHand.upHand).concat(center))
  }
}


function endHand(log = true) : void{
  let inPlayers = Players.filter(p => !p.curHand.folded && p.bank > 0)
  let playerScores = inPlayers.map((p) => {
    let bh = getHand(p)
    return getCardsScore(bh)
  })
  let indices: number[] = Array(playerScores.length).fill(0)
  for(let i = 0; i < indices.length; i++) indices[i] = i
  indices.sort((x,y) => playerScores[x] - playerScores[y])

  let scoreGroups: Player[][] = []
  let lastScore = 0
  for(let i of indices){
    if(playerScores[i] > lastScore){
      scoreGroups.push([inPlayers[i]])
      lastScore = playerScores[i]
    }
    else{
      scoreGroups[scoreGroups.length - 1].push(inPlayers[i])
    }
  }
  
  //Determines total amount each player is eligible to win 
  //Players cannot take more than what they put in themselves from any indivdual opponent
  for(let player in inPlayers){
    let p = inPlayers[player]
    let pot = 0
    for(let pi of Players.filter(p => p.bank > 0)){
      pot += Math.min(pi.curHand.equity, p.curHand.equity)
    }
    p.curHand.couldWin = pot
    p.curHand.net = -p.curHand.equity
  }

  for(let player of Players.filter(p => p.bank > 0 && p.curHand.folded)){
    player.curHand.net = -player.curHand.equity
  }

  //Distributes the pot to the winners
  //If they are not eligible to win the entire pot, the rest goes to second place
  for(let i = scoreGroups.length - 1; i >= 0; i--){
    let winners = scoreGroups[i]
    while(winners.length > 0){
      let minPot = Number.MAX_VALUE
      let minPlayer : number = 0
      for(let p in winners){
        if(winners[p].curHand.couldWin < minPot){
          minPot = winners[p].curHand.couldWin
          minPlayer = parseInt(p)
        }
      }
      
      let playerWinnings = Math.floor(minPot / winners.length)
      for(let p in winners){
        winners[p].curHand.net += playerWinnings
        for(let p in inPlayers){
          inPlayers[p].curHand.couldWin -= Math.min(playerWinnings, inPlayers[p].curHand.couldWin)
        }
      }
      winners.splice(minPlayer)
    }
  }

  //Give players their net payouts
  //Put any leftover unsplittable chips in the next hand's pot
  //let winners 
  for(let player in inPlayers){
    inPlayers[player].curHand.stack += inPlayers[player].curHand.net + inPlayers[player].curHand.equity
    leftOver = Math.max(leftOver, inPlayers[player].curHand.couldWin)
  }
  if(log){
    Actions.log(["Center: ", ...center.map(getCardString)])
    inPlayers.forEach((p,i) => {
      Actions.log([p, " shows ",...p.curHand.hand.map(getCardString)])
    })
    inPlayers.forEach((p,i) => {
      Actions.log([p, ": ", ...getHand(p).map(getCardString),
        ` ${getScoreString(playerScores[i])} `])
    })
  }
  Actions.log("Hand scores:")
  Players.applyLiving(p => {
    Actions.log([p, ": ", renderNet(p.curHand.net)])
  })
  
  Players.updateBanks(p => p.curHand.stack)
  Players.apply(p => p.curHand.hand = [])
  if(Game.getPhase() !== Phase.endgame){
    if(++handCount % Settings.getNumber("pokerHands") || gameMode() === "P"){
      Game.setPhase(Phase.poker)
    }
    else{
      Game.setPhase(Phase.nominate)
    }
  }
}

function dealCenter(n: number, log: boolean){
  for(let i = 0; i < n; i++) center.push(deck.pop() as number)
  if(log){
    Actions.log([`${street}: `, ...center.slice(center.length - n).map(getCardString)])
  }
}

function dealPlayerCards(p : Player){
  switch (Settings.getString("pokerType")){
    case "Texas Hold'em":
      p.curHand.hand = [deck.pop() as number, deck.pop() as number]
      p.curHand.upHand = []
      break
    case "Omaha":
      p.curHand.hand = [deck.pop() as number, deck.pop() as number, deck.pop() as number, 
        deck.pop() as number]
      p.curHand.upHand = []
      break
    case "5 Card Draw":
      p.curHand.hand = [deck.pop() as number, deck.pop() as number, deck.pop() as number, 
        deck.pop() as number, deck.pop() as number]
      p.curHand.upHand = []
      break
    case "7 Card Stud":
      p.curHand.hand = [deck.pop() as number, deck.pop() as number]
      p.curHand.upHand = [deck.pop() as number]
      break
  }
}

function preparePlayer(p : Player) : void{
  p.curHand = {
    equity: 0,
    amtIn: 0,
    folded: p.bank === 0,
    hand: [],
    upHand: [],
    stack: p.bank,
    couldWin: 0,
    net: 0,
    checked: false
  }
  if(p.bank > 0) dealPlayerCards(p)
  if(p.bankVision.length === 0) p.bankVision.push(p)
}

function updateDealer() : void{
  let nl = Players.nextLiving(dealer)
  if(nl !== false) dealer = nl
  else Game.setPhase(Phase.endgame)
}

/*
 * If a player will have the option to make a decision later in the current betting round
 * regardless of other players' actions
*/
function guaranteedDecision(p : Player) : boolean{
  let h = p.curHand
  if(p.dead) return false
  if(forced.includes(p) && Players.next(p,couldContinueBetting) !== false) return true
  return !h.folded && h.stack > 0 && (h.amtIn < maxAmtIn || (maxAmtIn === 0 && !h.checked))
}

/*
 * If the player has any possiblity of making another deicsion in the hand
 */

function couldContinueBetting(p: Player): boolean{
  let h = p.curHand
  return !h.folded && h.stack > 0 && !p.dead
}

/*
 * Limit for the specific player based on the game rules that is lower than their stack
 * Not bounded by player's stack
*/
export function getBetLimit(p: Player) : number{
  let type = Settings.getString("pokerType")
  if(type === "Omaha"){
    let amtToCall = maxAmtIn - p.curHand.amtIn
    let totalPot = pot + Players.players.map(p => p.curHand.amtIn).reduce((a,b) => a+b,0)
    return Math.max(totalPot + amtToCall * 2, BB)
  }
  return 1e6
} 

function roundDownToBet(n: number, b: number){
  return Math.floor(n / b) * b
}

export function studBetOptions(p: Player) : number[] {
  let h = p.curHand
  let options : number[] = []
  let bet = Settings.getNumber("bet")
  let ante = Settings.getNumber("ante")
  if(street === 0 && maxAmtIn === ante){
    options.push(ante)
  }
  else {
    options.push(0)
    if(maxAmtIn > p.curHand.amtIn) options.push(maxAmtIn - p.curHand.amtIn)
  }
  if(street < 2){ //pre 5th street
    options.push(roundDownToBet(maxAmtIn + bet, bet) - h.amtIn)
    if(street === 1 && h.upHand[0] % 13 === h.upHand[1] % 13){
      options.push(roundDownToBet(maxAmtIn + bet * 2, bet)  - h.amtIn)
    }
  }
  else{
    options.push(roundDownToBet(maxAmtIn + bet * 2, bet * 2) - h.amtIn)
  }
  return options
}

export function isStud() : boolean {
  return Settings.getString("pokerType") === "7 Card Stud"
}

function lastStreet() : number{
  if(isStud()) return 4
  else return 3
}

function bet(p : Player, amt : number, f = false) : boolean {
  if(amt < 0) return false
  if(dm === false || Players.get(dm) !== p) return false
  //reject players spending more than they have unless it's a blind and then correct to all in
  if(amt > p.curHand.stack) {
    if(!f) return false
    else amt = p.curHand.stack
  }
  //reject players betting above the limit defined by the game
  if(amt > getBetLimit(p)) return false

  if(amt < p.curHand.stack){
    //reject stud bets outside of the list of options
    if(!f && isStud() && !studBetOptions(p).includes(amt)){
      if(amt > 0) return false
      else amt = studBetOptions(p)[0]
    }
    //reject players undercalling
    if(amt > 0 && p.curHand.amtIn + amt < maxAmtIn) return false
    //reject players raising by less than the previous raise in NL
    if(!isStud() && !f && p.curHand.amtIn + amt - maxAmtIn > 0 && 
      p.curHand.amtIn + amt - maxAmtIn < minRaise)
      return false
  }
  p.curHand.amtIn += amt
  p.curHand.stack -= amt
  pot += amt
  if(p.curHand.amtIn > maxAmtIn){
    minRaise = Math.max(p.curHand.amtIn - maxAmtIn, BB)
    maxAmtIn = p.curHand.amtIn
    if(f) Actions.log([p , " posts blind of " + p.curHand.amtIn])
    else {
      Actions.log([p , " raises to " + p.curHand.amtIn])
    }
  }
  else if(p.curHand.amtIn + amt < maxAmtIn && p.curHand.stack > 0){
    p.curHand.folded = true
    Actions.log([p , " folds"])
  }
  else if(p.curHand.amtIn){
    Actions.log([p , " calls"])
  }
  else{
    p.curHand.checked = true
    Actions.log([p , " checks"])
  }

  if(f) forced.push(p)
  else if(forced.includes(p)) forced.splice(forced.indexOf(p), 1)
  dm = setDM(Players.next(dm, guaranteedDecision))

  if(dm === false){
    Players.applyLiving(p => {
      p.curHand.checked = false
    }, p => !p.curHand.folded)
    Players.applyLiving(p => {
      p.curHand.equity += p.curHand.amtIn
      p.curHand.amtIn = 0
    })
    let allFold = false
    if(Players.filter(couldContinueBetting).length <= 1){
      if(Players.filter(p => !p.curHand.folded).length === 1){
        allFold = true
      }
      setDM(false)
      while(street < lastStreet()) nextStreet(false)
    }
    else{
      if(!isStud()){
        setDM(Players.next(dealer, p => !p.curHand.folded))
      }
      else{
        setDM(Players.argMax(p => getCardsScore(p.curHand.upHand)))
      }
    }
    nextStreet(!allFold)
  }
  return true
}

let initialized = false

function initPoker(){
  BB = Settings.getNumber("BB")
  dealer = Rng.nextInt(Players.players.length)
  initialized = true
}
Actions.register(Phase.poker, (args: ActionArgs) => {
  let betAmt = args.v ? args.v : 0
  return bet(Players.get(args.p), betAmt, false)
})


export default function getDealer(){
  return {
    dealer: dealer,
    center: center,
    pot: pot,
    maxAmtIn: maxAmtIn,
    minRaise: minRaise
  }
}
