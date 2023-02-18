export default interface PokerHand {
  equity: number
  amtIn: number
  folded: boolean
  hand: number[]
  upHand: number[]
  stack: number
  couldWin: number
  net: number
  checked: boolean
}