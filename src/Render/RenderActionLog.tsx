import {useState} from 'react'
import Actions, {LogContent} from '../Model/Actions'
import react from 'react'
import Settings from '../Model/Settings'

export default function ActionLog(args: {p: number, height: number, socket: any, lobby: string}){

  return <div className = 'scroller' style={{height: args.height}}>
      {
      Actions.getActionLog().map((a, i) => <Hoverable actionIndex = {i} key = {i} 
        socket = {args.socket} lobby = {args.lobby}>{
        a.map((b, j) => <div style = {{marginLeft: j === 0 ? "30px" : undefined}} key = {i * 100 + j}>
        {flatten(b.map((c,k) => renderContent(c,args.p, i * 1e4 + j * 1e2 + k)))} 
        </div>)
      }</Hoverable>).reverse()
    }
  </div>
}

function renderContent(c: LogContent, p: number, k: number) : JSX.Element | JSX.Element[]{ 
  if(typeof c === "string") return <span key = {k}>{c}</span>
  if(!c) return <react.Fragment key={k}>{c}</react.Fragment>
  if("content" in c && "visibleTo" in c){
    const d = c as {content: string, visibleTo: number | number[] | boolean}
    const vt = d.visibleTo
    if(Settings.getBool("debugActionLog") || vt === false) return flatten(arrayify(d.content).map((e,i) => renderContent(e, p, k * 1e2 + i)))
    if(Array.isArray(vt)){
      if(vt.includes(p)) return flatten(arrayify(d.content).map((e,i) => renderContent(e, p, k * 1e2 + i)))
    }
    if(p === d.visibleTo) return flatten(arrayify(d.content).map((e,i) => renderContent(e, p, k * 1e2 + i)))
    return <span></span>
  }
  if("name" in c)  return <span key = {k} style = {{fontWeight : "bold"}}>{c.name}</span>
  return <react.Fragment key={k}>{c}</react.Fragment>
}

function arrayify(c: LogContent | (LogContent)[]) : (LogContent)[]{
  if(Array.isArray(c)) return c
  return [c]
}


function flatten(a: JSX.Element | any[]) : JSX.Element[]{
  if(Array.isArray(a)){
    return(a.reduce((b, c) => flatten(b).concat(flatten(c)), [] as JSX.Element[]))
  }
  return [a]
}


// function checkContent(p : string | JSX.Element | Player | ( string | JSX.Element | Player)[]) : any{
//   if(Array.isArray(p))return p.map(checkContent)
//   if(typeof p === "string") return p
//   if("name" in p)  return <span style = {{fontWeight : "bold"}}>{p.name}</span>
//   return p
// }

function Hoverable(props: {actionIndex: number, children: any, socket: any, lobby: string}){
  const [hover,setHover] = useState(false)
  return <div onMouseEnter = {() => setHover(true)} onMouseLeave = {() => setHover(false)} style = {{textDecoration: hover ? "underline" : "", marginBottom: "5px"}}
    onClick = {() => {
      if(Settings.getBool("debug")) props.socket.emit('rollback', props.lobby, props.actionIndex)
    }}>
    {props.children}
  </div>
}

