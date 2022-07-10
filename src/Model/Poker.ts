import Actions from "./Actions"
import Players from './Players'
import Player from './../Interface/Player'
import PokerHand from '../Interface/PokerHand'
import {getCardString, renderNet} from '../Render/PokerUtils'
import Phase from "../Interface/Phase"
import ActionArgs from "../Interface/Action"
import Game from "./Game"
import Settings from "./Settings"
import Rng from "./Rng"

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
function getHandScore(cards: number[]): number{
  let flush = getBestFlushHand(cards)
  let c = 13 ** 5
  if(flush !== null){
    let svf = getStraightValue(flush)
    if(svf > 0) return c * 8 + svf //straight flush
  }
  let nm = getNumberMatches(cards)
  let nmhs = getNMHandScore(nm)
  if(nm[0][0] === 4) return c * 7 + nmhs //quads
  if(nm[0][0] === 3 && nm[1][0] === 2) return c * 6 + nmhs //FH
  if(flush != null) return c * 5 + nmhs //flush
  let sv = getStraightValue(cards)
  if(sv > 0) return c * 4 + sv; //straight
  if(nm[0][0] === 3 && nm[1][0] === 1) return c * 3 + nmhs
  if(nm[0][0] === 2 && nm[1][0] === 2) return c * 2 + nmhs
  if(nm[0][0] === 2) return c + nmhs
  return nmhs
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
  for(const i of cards) suitCounts[Math.floor(i / 13)].push(i % 13);
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
    nums[12 - cards[i] % 13]++
  }
  let sum = 0
  let pairs: number[][] = []
  while(sum < 5){
    let max = Math.max(...nums)
    pairs.push([Math.min(max, 5 - sum), 12 - nums.indexOf(max)])
    sum += max
    nums[nums.indexOf(max)] = 0
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

type Street = "Preflop" | "Flop" | "Turn" | "River"

let dealer: number = 0
let forced: Player | false
//decision maker
let dm: number | false = 0
let pot: number 
let maxAmtIn: number
let minRaise: number
let street: Street
let center: number[]
let deck: number[]
let leftOver: number = 0

let BB = Settings.BB


Actions.onReset.push(() => {
  dealer = 0
  dm = 0
  pot = 0
  maxAmtIn = 0
  minRaise = 0
  street = "Preflop"
  center = []
  deck = getRandomDeck()
  leftOver = 0
})


function startHand() : void{
  Players.apply(p => {
    p.targetable = false
    p.curHand.stack = p.bank
  })
  pot = 0
  maxAmtIn = 0
  minRaise = BB
  street = "Preflop"
  center = []
  deck = getRandomDeck()

  updateDealer()
  Players.applyLiving(preparePlayer)
  setDM(Players.nextLiving(dealer))
  if(dm !== false){
    bet(Players.get(dm), Math.floor(BB/2), true)
    bet(Players.get(dm), BB, true)
  }
  else throw 'Not enough living players in poker' //ERROR
  
}

Game.setPhaseListener(Phase.poker, startHand)

function setDM(newDM : number | false){
  Players.setActive(newDM)
  dm = newDM
  return dm
}

function nextStreet() : void{
  maxAmtIn = 0
  minRaise = BB
  switch(street){
    case "Preflop":
      street = "Flop"
      dealCenter(3)
      break
    case "Flop":
      street = "Turn"
      dealCenter(1)
      break
    case "Turn":
      street = "River"
      dealCenter(1)
      break
    case "River":
      endHand()
      return
  }
}

function endHand(){
  let inPlayers = Players.filter(p => !p.curHand.folded && p.bank > 0)
  let playerScores = inPlayers.map((p) => {
    let s = getHandScore(p.curHand.hand.concat(center))
    return s
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
  
  for(let player in inPlayers){
    inPlayers[player].curHand.stack += inPlayers[player].curHand.net + inPlayers[player].curHand.equity
    leftOver = Math.max(leftOver, inPlayers[player].curHand.couldWin)
  }
  Players.updateBanks(p => p.curHand.stack)
  inPlayers.forEach((p,i) => {
    Actions.log([`${p.name}: `,...p.curHand.hand.map(getCardString), ` ${getScoreString(playerScores[i])} ` , renderNet(p.curHand.net)])
  })
  Players.players.filter(p => p.curHand.folded && p.bank > 0).forEach((p,i) => {
    Actions.log([`${p.name}: `,...p.curHand.hand.map(getCardString), ` folded ` , renderNet(p.curHand.net)])
  })
  if(Game.getPhase() !== Phase.endgame)
    Game.setPhase(Phase.nominate)
}

function dealCenter(n: number){
  for(let i = 0; i < n; i++) center.push(deck.pop() as number)
  Actions.log([`${street}: `, ...center.slice(center.length - n).map(getCardString)])

}

function preparePlayer(p : Player) : void{
  p.curHand = {
    equity: 0,
    amtIn: 0,
    folded: p.bank === 0,
    hand: [deck.pop() as number, deck.pop() as number],
    stack: p.bank,
    couldWin: 0,
    net: 0,
    checked: false
  }
}

function updateDealer() : void{
  let nl = Players.nextLiving(dealer)
  if(nl !== false) dealer = nl
  else throw 'Not enough living players in poker' //ERROR
}

function guaranteedDecision(p : Player) : boolean{
  let h = p.curHand
  if(forced){
    if(forced === p) if(Players.next(forced,guaranteedDecision)) return true
  }
  return !h.folded && h.stack > 0 && (h.amtIn < maxAmtIn || (maxAmtIn === 0 && !h.checked))
}

function couldContinueBetting(p: Player): boolean{
  let h = p.curHand
  return !h.folded && h.stack > 0
}


function bet(p : Player, amt : number, f = false) : boolean {
  if(dm === false || Players.get(dm) !== p) return false
  //reject players spending more than they have
  if(amt > p.curHand.stack) return false
  //reject players undercalling if they aren't all in
  if(amt > 0 && amt < p.curHand.stack && p.curHand.amtIn + amt < maxAmtIn) return false
  //reject players raising by less than the previous raise
  if(!f && p.curHand.amtIn + amt - maxAmtIn > 0 && p.curHand.amtIn + amt - maxAmtIn < minRaise) return false
  p.curHand.amtIn += amt
  p.curHand.stack -= amt
  if(p.curHand.amtIn > maxAmtIn){
    minRaise = Math.max(p.curHand.amtIn - maxAmtIn, BB)
    maxAmtIn = p.curHand.amtIn
    if(f) Actions.log(p.name + " posts blind of " + p.curHand.amtIn)
    else Actions.log(p.name + " raises to " + p.curHand.amtIn)
  }
  else if(p.curHand.amtIn + amt < maxAmtIn && p.curHand.stack > 0){
    p.curHand.folded = true
    Actions.log(p.name + " folds")
  }
  else if(p.curHand.amtIn){
    Actions.log(p.name + " calls")
  }
  else{
    p.curHand.checked = true
    Actions.log(p.name + " checks")
  }
  if(f) forced = p
  else if(forced === p) forced = false
  dm = setDM(Players.next(dm, guaranteedDecision))
  if(dm === false){
    Players.applyLiving(p => {
      p.curHand.checked = false
    }, p => !p.curHand.folded)
    Players.applyLiving(p => {
      p.curHand.equity += p.curHand.amtIn
      pot += p.curHand.amtIn
      p.curHand.amtIn = 0
    })
    if(Players.filter(couldContinueBetting).length <= 1){
      setDM(false)
      while(street !== "River") nextStreet()
    }
    else{
      setDM(Players.next(dealer, p => !p.curHand.folded))
    }
    nextStreet()
  }
  return true
}



Actions.register(Phase.poker, (args: ActionArgs) => {
  if(args.v === undefined) return false
  return bet(Players.get(args.p), args.v, false)
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
