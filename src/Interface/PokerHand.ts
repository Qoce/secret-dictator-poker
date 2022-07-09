export default interface PokerHand {
  equity: number
  amtIn: number
  folded: boolean
  hand: number[]
  stack: number
  couldWin: number
  net: number
}