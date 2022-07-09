import Actions from '../Model/Actions'
import {useState} from 'react'


export default function ActionLog(){

  return <div className = 'scroller'>
    <div>
    {
      Actions.getActionLog().map((a,i) => <Hoverable actionIndex = {i}>{a.map((a) => <div>{a}</div>)}</Hoverable>)
    }
    </div>
  </div>
}

function Hoverable(props: {actionIndex: number, children: any}){
  const [hover,setHover] = useState(false)
  return <div onMouseEnter = {() => setHover(true)} onMouseLeave = {() => setHover(false)} style = {{textDecoration: hover ? "underline" : ""}}
  onClick = {() => Actions.resimulate(props.actionIndex)}>
    
    {props.children}
  </div>
}

