import {useState, useEffect, useRef} from 'react'

interface NotifierDetails{
  s: string | string[],
  ps?: number[],
  ok?: boolean,
  timeout?: number
}

export let Notifier = {
  notify(s: string){
    this.customNotify({s: s})
  },
  customNotify(args: NotifierDetails){}
}

export default function Notification(args: {user: number}){
  const [shown, setShown] = useState(true)
  const [strs, setStrs] = useState([] as string[])
  const [time, setTime] = useState(2000)
  const [ok, setOk] = useState(false)
  const [gone, setGone] = useState(false)
  const stateRef = useRef<boolean>()
  stateRef.current = ok

  Notifier.customNotify = (d : NotifierDetails) => {
    if(!d.ps || d.ps.includes(args.user)){
      //if(str === d.s) d.s += " "
      if(!Array.isArray(d.s)) d.s = [d.s]
      setOk(d.ok || false)
      setStrs(d.s)
      setShown(true)
      setGone(false)
      setTime(d.timeout || 0)
    }
  }

  useEffect(() => {
    let oldStrs = strs
    setTimeout(() => {
      if(strs === oldStrs && !stateRef.current) setShown(false)
    }, (time || 2000))
  }, [strs])
  if(gone) return null
  return <div className = {"noti hoveree transparent " + (shown ? "" : "hidden")}
    style = {{display: "table-cell", transform: "translateY(0%)"}}
    onTransitionEnd={() => {setGone(true)}}
    onClick = {() => {
      if(!ok) setShown(false)
    }}>
      {strs.map(s => <div>{s}</div>)}
      {ok && <button onClick = {() => setShown(false)}>
        OK
      </button>
      }
  </div>
}