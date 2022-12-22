import SDState from "../Model/SecretDictator"
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
  team: "l" | "f",
  selected: boolean,
  selectable: boolean,
  setSelected: (selected : boolean) => void
}

export function PolicySquare(props: PolicySquareArgs){
  const [hovered, setHovered] = useState(false)
  let bgColor = [["lightBlue","blue"],["pink","red"]][props.team === 'l' ? 0 : 1][props.selected ? 1 : 0]
  return <div className = "square" style = {{backgroundColor: bgColor, marginLeft: 5 ,
    marginTop: "2px", border: "2px solid", borderColor: hovered ? "green" : "grey"}}
     onClick = {() => {if(props.selectable) props.setSelected(!props.selected)}} 
     onMouseEnter = {() => {if(props.selectable) setHovered(true)}} 
     onMouseLeave = {() => setHovered(false)}>
    {props.team.toUpperCase()}
  </div>  
}

export function colorPolicy(p: "l" | "f"){
  if(p === "l") return <span style = {{color: "blue", fontWeight: "bold"}}> L </span>
  else return <span style = {{color: "red", fontWeight: "bold"}}> F </span>
}

export function getTeamString(args: {u: Player, p: Player, inEndgame: boolean}){
  let showHitler = args.u.role.team !== Team.liberal || args.inEndgame
  if(!args.u.role.vision.includes(args.p) && !args.inEndgame) return ""
  let t = args.p.role.team 
  if(!showHitler && t === Team.dictator) t = Team.fascist 
  let color = t === Team.liberal ? "Blue" : "Red"
  return <span style = {{color: color}}>
    {["L","F","D"][t]} 
  </span>
}
