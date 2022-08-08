import  Settings from "../Model/Settings"
import SocketIO from 'socket.io'

import react from 'react'

export default function SettingsRender(props: {socket: any, lobby: any, onStart: any}){
  const stngs : any[] = []
  Settings.settings.forEach((_, key) => {
    const setting = Settings.settings.get(key)?.value
    if(typeof setting === "number"){
      stngs.push(<NumberSetting sKey = {key} key = {key} socket = {props.socket} lobby = {props.lobby}/>)
    }
    if(typeof setting === "boolean"){
      stngs.push(<BooleanSetting sKey = {key} key = {key} socket = {props.socket} lobby = {props.lobby}/>)
    }
    if(typeof setting === "string"){
      stngs.push(<StringSetting sKey = {key} key = {key} socket = {props.socket} lobby = {props.lobby}/>)
    }
  })
  return <div className = "settings" style = {{marginRight: "10px"}}>
    {stngs}
    <button onClick = {props.onStart}>
      Start
    </button>
  </div>
}

interface SettingsProps {
  sKey: string,
  lobby: string,
  socket: SocketIO.Socket
}

function NumberSetting(props: SettingsProps){
  const val = Settings.getNumber(props.sKey)
  const [num, setNum] = react.useState(val)
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) +": "}</label>
      <input className = "textInput" type = 'number' min = {0} max = {100000} 
      value = {num}
      onChange = {(e) => {
        setNum(+e.target.value)
        Settings.set(props.sKey, +e.target.value, props.socket, props.lobby)
      }}/>
  </div>
}

function BooleanSetting(props: SettingsProps){
  const val = Settings.getBool(props.sKey)
  const [bool, setBool] = react.useState(val)
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <input type = "checkbox" checked = {bool} onChange = {(e) => {
       setBool(e.target.checked)
       Settings.set(props.sKey, e.target.checked, props.socket, props.lobby)
    }}/>
  </div>
}

function StringSetting(props: SettingsProps){  
  if(Settings.settings.get(props.sKey)?.values === undefined) throw Error(props.sKey + " arbitrary string settings are not supported")
  if(Settings.settings.get(props.sKey)?.values?.length === 0) throw Error(props.sKey + " setting has no options")
  let values = Settings.settings.get(props.sKey)?.values as string[]
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <select name = {Settings.getName(props.sKey)} onChange = {event => {

        Settings.set(props.sKey, event.target.value)
      }}>
      {values.map((value, index) => {
        return <option key = {index} value = {value}>{value}</option>
      })}
    </select>
  </div>
}