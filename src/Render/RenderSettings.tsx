import  Settings from "../Model/Settings"

import react, {useState} from 'react'

export default function SettingsRender(props: any){
  const stngs : any[] = []
  Settings.settings.forEach((_, key) => {
    const setting = Settings.settings.get(key)?.value
    if(typeof setting === "number"){
      stngs.push(<NumberSetting sKey = {key} key = {key}/>)
    }
    if(typeof setting === "boolean"){
      stngs.push(<BooleanSetting sKey = {key} key = {key}/>)
    }
    if(typeof setting === "string"){
      stngs.push(<StringSetting sKey = {key} key = {key}/>)
    }
  })
  return <div className = "settings" style = {{marginRight: "10px"}}>
    {stngs}
    <button onClick = {props.onStart}>
      Start
    </button>
  </div>
}
function NumberSetting(props: {sKey: string}){
  const val = Settings.getNumber(props.sKey)
  const [num, setNum] = react.useState(val)
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) +": "}</label>
      <input className = "textInput" type = 'number' min = {0} max = {100000} 
      value = {num}
      onChange = {(e) => {
        setNum(+e.target.value)
        Settings.set(props.sKey, +e.target.value)
      }}/>
  </div>
}

function BooleanSetting(props: {sKey: string}){
  const val = Settings.getBool(props.sKey)
  const [bool, setBool] = react.useState(val)
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <input type = "checkbox" checked = {bool} onChange = {(e) => {
       setBool(e.target.checked)
       Settings.set(props.sKey, e.target.checked)
    }}/>
  </div>
}

function StringSetting(props: {sKey: string}){
  const val = Settings.getString(props.sKey)
  const [_, setStr] = react.useState(val)
  if(Settings.settings.get(props.sKey)?.values === undefined) throw Error(props.sKey + " arbitrary string settings are not supported")
  if(Settings.settings.get(props.sKey)?.values?.length === 0) throw Error(props.sKey + " setting has no options")
  let values = Settings.settings.get(props.sKey)?.values as string[]
  return <div style = {{textAlign: "left"}}>
    <label>{Settings.getName(props.sKey) + ": "}</label>
    <select name = {Settings.getName(props.sKey)} onChange = {event => {
        setStr(event.target.value)
        Settings.set(props.sKey, event.target.value)
      }}>
      {values.map((value, index) => {
        return <option key = {index} value = {value}>{value}</option>
      })}
    </select>
  </div>
}