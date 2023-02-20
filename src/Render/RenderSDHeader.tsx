import Game from "../Model/Game"
import Phase from "../Interface/Phase"
import SDData, {getSpecialPhase, setFPassed, setLPassed} from "../Model/SecretDictator"
import {Team} from "../Interface/Role"
import Settings, { gameMode } from "../Model/Settings"
import Players from "../Model/Players"


interface SHSquareArgs{
  passed: boolean,
  liberal: boolean,
  typeStr: string,
  shift?: number,
  colorOverride?: string,
  index: number
}

function SHSquare(props: SHSquareArgs){
  let bcColor = (props.passed && (props.liberal ? "blue" : "red")) || 
    (props.liberal ? "lightBlue" : "pink") 
  if(props.colorOverride){
    bcColor = props.colorOverride
  }
  return <div className = "square" style = {{backgroundColor: bcColor, 
    marginLeft: props.shift, marginTop: "2px"}}
    onClick = {() => {if(props.liberal && Settings.getBool('debug')) setLPassed(props.index+1);
    else if(Settings.getBool('debug')) setFPassed(props.index+1)}}>
    {props.typeStr}
  </div>  
}

interface ProgSquareArgs{
  current: boolean,
  shift?: number,
}
  
//Indicates progress towards top carding
function ProgSquare(props : ProgSquareArgs){
  let bcColor = props.current ? "green" : "lightGreen"
  return <div className = "square" style = {{backgroundColor: bcColor, 
    marginLeft: props.shift, marginTop: "2px"}}>
    {""}
  </div>  
}

function getPhaseIcon(phase: Phase, endgame: string){
  if(phase === Phase.investigate) return "🔎"
  if(phase === Phase.assassinate) return "🗡️"
  if(phase === Phase.peak) return "🃏"
  if(phase === Phase.pickPres) return "🕴️"
  if(phase === Phase.endgame) return endgame
  return ""
}

export default function SDHeader(args: {user: number}){
  if(gameMode() === "P") return null
  let data = SDData()
  let fascistSquares: JSX.Element[] = []

  let visibleDictatorStatus = 
    Settings.getString("dictatorWin") === "Dictator Election Required" &&
    (Players.get(args.user).role.team !== Team.liberal || data.fPassed >= 6)
  

  for(let i = 0; i < 6; i++){
    fascistSquares.push( 
    <SHSquare liberal = {false} typeStr = {getPhaseIcon(getSpecialPhase(i), 
      (visibleDictatorStatus && !data.dictatorElected) ? "🗡️" : "💀")} 
      passed = {data.fPassed > i} key = {i} index = {i}/>)
  }
  if(Settings.getString("dictatorWin") === "Dictator Election Required"){
    fascistSquares.push(
      <SHSquare liberal = {false} typeStr = {"🧥"} passed = 
        {data.dictatorElected} shift = {10} index = {0}
        colorOverride = {!visibleDictatorStatus ? "BlueViolet" : undefined}
      />
    )
  }
  let liberalSquares: JSX.Element[] = []
  for(let i = 0; i < 5; i++){
    liberalSquares.push( 
    <SHSquare liberal = {true} typeStr = {i === 4 ?  "🕊️" : ""}
      passed = {data.lPassed > i} key = {i + 6} index = {i}/>)
  }
  let proposalSquares: JSX.Element[] = []
  for(let i = 0; i < 3; i++){
    proposalSquares.push(
      <ProgSquare current = {i === data.failCount} key = {i + 11}/>)
  }
  return <div className = "center">
    <div>
      {fascistSquares}
    </div>
    <div>
      {liberalSquares}
    </div>
    <div>
      {Game.getPhase() !== Phase.poker && proposalSquares}
    </div>
  </div>
}