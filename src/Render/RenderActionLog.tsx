import Actions from '../Model/Actions'
import Players from '../Model/Players'
import {useState, useRef, useEffect} from 'react'
import Player from '../Interface/Player'
import Settings from '../Model/Settings'

export default function ActionLog(args: {p: number, height: number}){
  let a : any
  const scrollRef = useRef(a)

  useEffect(() => {
    if(scrollRef && scrollRef.current)
      scrollRef.current.scrollIntoView({behavior: "smooth"})
  })
  return <div className = 'scroller' style={{height: args.height}}>
    <div style={{height: args.height}}>
      {
      Actions.getActionLog().map((a, i) => <Hoverable actionIndex = {i}>{
        a.map((a, index) => <div style = {{marginLeft: index > 0 ? "30px" : undefined}}>{a.map((a) => {
          if(typeof a === "string") return a
          if("content" in a && "visibleTo" in a){
            const d = a as {content: string, visibleTo: number}
            const vt = d.visibleTo
            if(Array.isArray(vt)){
              if(Settings.getBool("debug") || vt.includes(args.p)) return checkContent(d.content)
            }
            if(Settings.getBool("debug") || args.p === d.visibleTo) return checkContent(d.content)
            return null
          }
          return checkContent(a) as JSX.Element
        
        })}
        <div ref = {scrollRef}/>
        </div>)
      }</Hoverable>)
    }
    </div>
    
  </div>
}

function checkContent(p : string | JSX.Element | Player | ( string | JSX.Element | Player)[]) : any{
  if(Array.isArray(p))return p.map(checkContent)
  if(typeof p === "string") return p
  if("name" in p)  return <span style = {{fontWeight : "bold"}}>{p.name}</span>
  return p
}

function Hoverable(props: {actionIndex: number, children: any}){
  const [hover,setHover] = useState(false)
  return <div onMouseEnter = {() => setHover(true)} onMouseLeave = {() => setHover(false)} style = {{textDecoration: hover ? "underline" : "", marginBottom: "5px"}}
  onClick = {() => Actions.resimulate(props.actionIndex)}>
    
    {props.children}
  </div>
}

