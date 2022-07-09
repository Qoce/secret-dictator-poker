import SDState from "../Model/SecretDictator"
import {useState} from 'react'

interface VoteSquare{
  shift?: number,
  onClick: () => void,
  str: string
}

export function VoteSquare(props : VoteSquare){
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

interface PolicySquare{
  team: "l" | "f",
  selected: boolean,
  selectable: boolean,
  setSelected: (selected : boolean) => void
}

export function PolicySquare(props: PolicySquare){
  const [hovered, setHovered] = useState(false)
  let bgColor = [["lightBlue","blue"],["pink","red"]][props.team === 'l' ? 0 : 1][props.selected ? 1 : 0]
  return <div className = "square" style = {{backgroundColor: bgColor, marginLeft: 5 ,
    marginTop: "2px", border: "2px solid", borderColor: hovered ? "green" : "grey"}}
     onClick = {() => {if(props.selectable) props.setSelected(!props.selected)}} 
     onMouseEnter = {() => setHovered(true)} 
     onMouseLeave = {() => setHovered(false)}>
    {props.team.toUpperCase()}
  </div>  
}