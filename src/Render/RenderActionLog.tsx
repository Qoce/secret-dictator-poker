import Actions, {logElement} from '../Model/Actions'
import Players from '../Model/Players'
import {useState, useRef, useEffect} from 'react'
import Player from '../Interface/Player'
import Settings from '../Model/Settings'
import { debug } from 'console'

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
        a.map((b, j) => <div style = {{marginLeft: j > 0 ? "30px" : undefined}}>
        {flatten(b.map((c) =>  renderContent(c,args.p)))} 
        <div ref = {scrollRef}/>
        </div>)
      }</Hoverable>)
    }
    </div>
    
  </div>
}

function renderContent(c: string | JSX.Element | Player | logElement, p: number) : JSX.Element | JSX.Element[]{ 
  if(typeof c === "string") return <span>{c}</span>
  if("content" in c && "visibleTo" in c){
    const d = c as {content: string, visibleTo: number}
    const vt = d.visibleTo
    if(Array.isArray(vt)){
      if(Settings.getBool("debug") || vt.includes(p)) return flatten(arrayify(d.content).map((e) => renderContent(e, p)))
    }
    if(Settings.getBool("debug") || p === d.visibleTo) return flatten(arrayify(d.content).map((e) => renderContent(e, p)))
    return <span></span>
  }
  if("name" in c)  return <span style = {{fontWeight : "bold"}}>{c.name}</span>
  return c as JSX.Element
}

function arrayify(c: string | JSX.Element | Player | logElement | (string | JSX.Element | Player | logElement)[]) : (string | JSX.Element | Player | logElement)[]{
  if(Array.isArray(c)) return c
  return [c]
}


function flatten(a: JSX.Element | any[]) : JSX.Element[]{
  if(Array.isArray(a)){
    return(a.reduce((b, c) => flatten(b).concat(flatten(c)), [] as JSX.Element[]))
  }
  return [a]
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

