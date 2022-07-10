import PokerHand from "./PokerHand"
import {Role} from "./Role"

export default interface Player {
  curHand: PokerHand
  role: Role
  bank: number
  name: string
  canAct: boolean
  targetable: boolean
}