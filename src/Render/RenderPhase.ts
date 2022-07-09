import Player from "../Interface/Player"
import Phase from "../Interface/Phase"

export interface RenderPhaseArgs{
  p: number
  t?: number
}

let actions : {[key in Phase]?: (args: RenderPhaseArgs) => JSX.Element | undefined} = {}

export default actions