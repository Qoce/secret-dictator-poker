import ActionArgs from './Action'

export default interface Lobby{
  name: string,
  password: string,
  players: string[],
  inGame: boolean,
  seed: number,
  actions: ActionArgs[],
  settings: any[][]
}