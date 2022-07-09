import Player from './Player'

export enum Team{
  liberal,
  fascist,
  dictator,
}

export interface Role{
  team: Team,
  vision: Player[],
  influence: number,
  spent: number,
  vote: boolean | undefined,
}