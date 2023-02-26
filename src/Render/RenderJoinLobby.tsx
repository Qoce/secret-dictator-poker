import {useRef} from 'react'

export default function JoinLobby(args: {s?: string, oj: (n: string, u:string, p:string) => void}){
  const lobbyName = useRef<HTMLInputElement>(null)
  const username = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)

  return <div className = "center">
    {!args.s && <div>
      <label>Lobby Name</label>
      <input className = "textInput" type = "text" ref = {lobbyName}/>
    </div>}
    <div>
      <label>Username</label>
      <input className = "textInput" type = "text" ref = {username} maxLength = {14}/>
    </div>
    <div>
      <label>Password</label>
      <input className = "textInput" type = "password" ref = {password}/>
    </div>
      <button className = "button" onClick = {() => {
        if(!(args.s || (lobbyName && lobbyName.current)) && username && password && username.current && password.current){
          return
        }
        if(args.s){
          args.oj(args.s, username.current!.value, password.current!.value)
        }
        else{
          args.oj(lobbyName.current!.value, username.current!.value, password.current!.value)
        }
      }}>
      {args.s ? "Join Lobby" : "Create Lobby"}
    </button>
  </div>
}