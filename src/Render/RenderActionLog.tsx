import Actions from '../Model/Actions'
import Players from '../Model/Players'
import {useState} from 'react'
import Player from '../Interface/Player'
import Settings from '../Model/Settings'

export default function ActionLog(args: {p: number}){

  return <div className = 'scroller'>
    <div>
    {
      Actions.getActionLog().map((a, i) => <Hoverable actionIndex = {i}>{
        a.map((a) => <div>{a.map((a) => {
          if(typeof a === "string") return a
          if("content" in a && "visibleTo" in a){
            const d = a as {content: string, visibleTo: number}
            const vt = d.visibleTo
            if(Array.isArray(vt)){
              if(vt.includes(args.p)) return d.content
            }
            if(Settings.debug || args.p === d.visibleTo) return d.content
            return null
          }
          return a as JSX.Element
        
        })}
        
        </div>)
      }</Hoverable>)
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

