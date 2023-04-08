import {useState, useEffect} from 'react'

export let Notifier = {
  notify(s: string, ps?:number[]){}
}

export default function Notification(args: {user: number}){
  const [shown, setShown] = useState(true)
  const [str, setStr] = useState("")

  Notifier.notify = (s: string, ps?:number[]) => {
    if(!ps || ps.includes(args.user)){
      if(str === s) s += " "
      setStr(s)
      setShown(true)
    }
  }

  useEffect(() => {
    let oldStr = str
    setTimeout(() => {
      if(str === oldStr) setShown(false)
    }, 2000)
  }, [str])
  return <div className = {"noti hoveree transparent " + (shown ? "" : "hidden")}
    style = {{display: "block", transform: "translateY(0%)"}}
    onClick = {() => setShown(false)}>
      {str}
  </div>
}