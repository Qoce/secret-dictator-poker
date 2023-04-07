import SDState, {Policy} from "../Model/SecretDictator"
import {useState} from 'react'
import Player from "../Interface/Player"
import {Team} from "../Interface/Role"

interface VoteSquareArgs{
  shift?: number,
  onClick: () => void,
  str: string
}

export function VoteSquare(props : VoteSquareArgs){
  const [hovered, setHovered] = useState(0)
  let bgColor = ["hsl(" + SDState().bg + ",90%,72%)", "hsl(" + SDState().bg + ",100%,80%)"][hovered]
  return <div className = "square" style = {{backgroundColor: bgColor, 
      marginLeft: props.shift, marginTop: "2px"}}
    onMouseEnter = {() => setHovered(1)} 
    onMouseLeave = {() => setHovered(0)}
    onClick = {props.onClick}>
    {props.str}
  </div>  
}

interface PolicySquareArgs{
  policy: Policy,
  selected: boolean,
  selectable: boolean,
  setSelected: (selected : boolean) => void
}

export function PolicySquare(props: PolicySquareArgs){
  const [hovered, setHovered] = useState(false)
  let colors = {
    [Policy.liberal]: ["lightBlue", "blue"],
    [Policy.fascist]: ["pink","red"],
    [Policy.libertarian]: ["LemonChiffon", "yellow"]
  }[props.policy]
  let string = {
    [Policy.liberal]: "L",
    [Policy.fascist]: "F",
    [Policy.libertarian]: "L" 
  }[props.policy]
  let description = {
    [Policy.liberal]: "",
    [Policy.fascist]: "",
    [Policy.libertarian]:
      "Libertarian policy: Triple the value of the poker big blind or bet."
  }[props.policy]
  let bgColor = colors[props.selected ? 1 : 0]
  console.log(bgColor)
  return <div className = "square hoverable" style = {{backgroundColor: bgColor, marginLeft: 5 ,
    marginTop: "2px", border: "2px solid", borderColor: hovered ? "green" : "grey"}}
     onClick = {() => {if(props.selectable) props.setSelected(!props.selected)}} 
     onMouseEnter = {() => {if(props.selectable) setHovered(true)}} 
     onMouseLeave = {() => setHovered(false)}>
    {string}
    {<div className = "hoveree transparent">
      {description}
    </div>}
  </div>  
}

export function colorPolicy(p: Policy){
  let color = {
    [Policy.liberal]: "blue",
    [Policy.fascist]: "red",
    [Policy.libertarian]: "yellow" 
  }[p]
  let str = {
    [Policy.liberal]: "L",
    [Policy.fascist]: "F",
    [Policy.libertarian]: "L" 
  }[p]
  return <span style = {{color: color, fontWeight: "bold"}}>{str}</span>
}

export function getTeamString(args: {u: Player, p: Player, inEndgame: boolean}){
  let showHitler = args.u.role.team !== Team.liberal || args.inEndgame
  if(!args.u.role.vision.includes(args.p) && !args.inEndgame) return ""
  let t = args.p.role.team 
  if(!showHitler && t === Team.dictator) t = Team.fascist
  let color = {
    [Team.liberal]: "blue",
    [Team.fascist]: "red",
    [Team.dictator]: "red"
  }[t]
  let string = {
    [Team.liberal]: "L",
    [Team.fascist]: "F",
    [Team.dictator]: "D"
  }[t]
  return <span style = {{color: color}}>
    {string} 
  </span>
}
