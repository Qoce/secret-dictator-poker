import { useEffect } from "react";

export default function LobbyList(args: {ls: string[], rj:[string, number, number][], cr: () => void, 
  join: (n : string) => void, qj : () => void}){

  const handleUserKeyPress = (event : any) => {
    const { key, keyCode } = event;
    if (key === "q" || keyCode === 81) {
      args.qj()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress)
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress)
    };
  }, [handleUserKeyPress])
  
  return <div className = "center">
    {args.ls.map((l, i) => <div className = "name" key = {i} onClick = {
      () => args.join(l)
    }>{l}</div>)}
    {args.rj.map((l, i) => <div className = "name" key = {i} onClick = {
      () => {
        args.join(l[0])
      }
    }>{l[0] + "(" + l[1] + "/" + l[2] + ")"}</div>)}
    <button onClick = {args.cr}>
      Create Room
    </button>
  </div>
}