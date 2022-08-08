export default function LobbyList(args: {ls: string[], cr: () => void, 
  join: (n : string) => void}){
  return <div>
    {args.ls.map((l, i) => <div className = "name" key = {i} onClick = {
      () => args.join(l)
    }>{l}</div>)}
    <button onClick = {args.cr}>
      Create Room
    </button>
  </div>
}