import  Settings, {gameMode} from "../Model/Settings"
import SocketIO from 'socket.io'

import react from 'react'

export function SettingsRender(props: 
  {socket: any, lobby: any, onStart: any, isHost: boolean, numPlayers: number}){
  const stngs : any[] = []
  Settings.settings.forEach((val, key) => {
    if(val.local) return
    if(val.hostOnly && !props.isHost) return
    stngs.push(RenderSetting(key, props))
  })
  let playersNeeded = gameMode() === "P" ? 2 : 5
  return <div className = "settings" style = {{marginRight: "10px"}}>
    {stngs}
    <button 
      onClick = {props.onStart}
      disabled = {!props.isHost || props.numPlayers < playersNeeded}
    >
      Start
    </button>
  </div>
}

interface SettingsProps {
  sKey: string,
  lobby: string,
  socket: SocketIO.Socket,
  isHost: boolean,
  onChange?: any
}

export function LocalSettingsRender(){
  const [opened, setOpened] = react.useState(false)
  
  const stngs : any[] = []
  Settings.settings.forEach((val, key) => {
    if(!val.local) return
    stngs.push(RenderSetting(key, {socket: null, lobby: null, isHost: true}))
  })

  return <div className = "inLineRow">
    <div className = "gear" onClick = {
      () => setOpened(!opened)
      }>
    ⚙️
    </div>
    <div style = {{"marginTop": "50px"}}>
      {opened && stngs}
    </div>
  </div>
}

function RenderSetting(key : string, props: {socket: any, lobby: any, isHost: boolean}){
  const s = Settings.settings.get(key)
  const setting = s?.value
  const onChange = s?.onChange
  const visibibleIf = s?.visibleIf
  if(visibibleIf && !visibibleIf()) return null
  if(typeof setting === "number"){
    return <NumberSetting sKey = {key} 
      key = {key} 
      socket = {props.socket} 
      lobby = {props.lobby}
      isHost = {props.isHost}
      onChange = {onChange}
      />
  }
  if(typeof setting === "boolean"){
    return <BooleanSetting 
      sKey = {key}
      key = {key}
      socket = {props.socket}
      lobby = {props.lobby}
      isHost = {props.isHost}
      onChange = {onChange}
    />
  }
  if(typeof setting === "string"){
    return <StringSetting
      sKey = {key}
      key = {key}
      socket = {props.socket}
      lobby = {props.lobby}
      isHost = {props.isHost}
      onChange = {onChange}
    />
  }
}

function NumberSetting(props: SettingsProps){
  const val = Settings.getNumber(props.sKey)
  const [num, setNum] = react.useState(val)
  if(num !== val){
    setNum(val)
  }
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) +": "}</label>
      <input className = "textInput" type = 'number' min = {0} max = {100000} 
      disabled = {!props.isHost}
      value = {num}
      onChange = {(e) => {
        setNum(+e.target.value)
        Settings.set(props.sKey, +e.target.value, props.socket, props.lobby)
        if(props.onChange) props.onChange(+e.target.value)
      }}/>
  </div>
}

function BooleanSetting(props: SettingsProps){
  const val = Settings.getBool(props.sKey)
  const [bool, setBool] = react.useState(val)
  if (bool !== val){
    setBool(val)
  }
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <input type = "checkbox" checked = {bool}    
      disabled = {!props.isHost}   
      onChange = {(e) => {
       setBool(e.target.checked)
       Settings.set(props.sKey, e.target.checked, props.socket, props.lobby)
       if(props.onChange) props.onChange(e.target.checked)
    }}/>
  </div>
}

function StringSetting(props: SettingsProps){  
  if(Settings.settings.get(props.sKey)?.values === undefined) throw Error(props.sKey + " arbitrary string settings are not supported")
  if(Settings.settings.get(props.sKey)?.values?.length === 0) throw Error(props.sKey + " setting has no options")
  let values = Settings.settings.get(props.sKey)?.values as string[]
  const val = Settings.getString(props.sKey)
  const [str, setStr] = react.useState(values[0])
  if(str !== val){
    setStr(val)
  }
  
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <select name = {Settings.getName(props.sKey)} 
      disabled = {!props.isHost}
      value = {str}
      onChange = {event => {
        setStr(event.target.value)
        Settings.set(props.sKey, event.target.value, props.socket, props.lobby)
        if(props.onChange) props.onChange(event.target.value)
      }}>
      {values.map((value, index) => {
        return <option key = {index} value = {value}>{value}</option>
      })}
    </select>
  </div>
}
