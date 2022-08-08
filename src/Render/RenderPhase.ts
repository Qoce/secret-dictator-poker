import Phase from "../Interface/Phase"
import React from "react"

export interface RenderPhaseArgs{
  p: number
  t?: number
}

let actions: Map<Phase, React.FunctionComponent<RenderPhaseArgs>> = new Map<Phase, React.FunctionComponent<RenderPhaseArgs>> ()

export default actions