import SocketIO from 'socket.io'
import Setting from '../Interface/Setting'
import { refresh } from '../Render/RenderGame'

interface StoredSetting extends Setting{
  default: number | boolean | string
}

let settings = {
  settings: new Map<string, StoredSetting>(),
  getValue(key : string){
    if(!this.settings.has(key)) throw Error('Setting ' + key + ' not found!')
    let activeIf = this.settings.get(key)?.activeIf
    if(!activeIf || activeIf()) return this.settings.get(key)?.value
    else return this.settings.get(key)?.default
  },
  getNumber(key : string){
    const value = this.getValue(key)
    if(typeof value !== "number") throw Error("Settings field " + key + " is not a number")
    return value
  },
  getString(key : string){
    const value = this.getValue(key)
    if(typeof value !== "string") throw Error("Settings field " + key + " is not a string")
    return value
  },
  getBool(key : string){
    const value = this.getValue(key)
    if(typeof value !== "boolean") throw Error("Settings field " + key + " is not a bool")
    return value
  },
  getName(key: string){
    const value = this.settings.get(key)?.value
    if(typeof value === 'undefined') throw Error('Setting ' + key + ' not found!')
    return this.settings.get(key)?.name as string
  },
  set(key : string, value : number | boolean | string, 
      socket : SocketIO.Socket | undefined = undefined, 
      lobby : string | undefined = undefined){
    let s = this.settings.get(key) 
    if(s !== undefined){
      if(typeof s.value === "number" && typeof value === "number"){
        if(value < (s.min || 0)) value = s.min || 0
        if(value > (s.max || 1e6)) value = s.max || 1e6
      }
      if(typeof s.value === "string"){
        if(s.values && !s.values.includes(s.value)){
          throw Error("Invalid setting value for " + key + ": " + value)
        }
      }
      if(socket !== undefined && s.local !== true){
        socket.emit('changeSetting', lobby, key, value)
      }
      else{
        s.value = value
      }
    }
  },
  register(key : string, val: Setting){
    this.settings.set(key, {...val, default: val.value})
  },
  atLeast(key: string, value: string){
    const s = this.settings.get(key)?.value
    if(typeof s !== "string") throw Error('Setting ' + key + ' not found!')
    let values = this.settings.get(key)?.values as string[]
    if(!values.includes(value)) throw Error(value + ' is not a valid value for ' + key)
    return values.indexOf(s) >= values.indexOf(value)
  },
  loadPreset(s:  any[][]){
    for(let setting of s){
      this.set(setting[0], setting[1])
    }
  }
}

export function gameMode(){
  return settings.getString("gameMode")
}

settings.register("gameMode", {value: "SDP", name: "Game Mode", values:
  ["SDP", "SD", "P"], onChange: refresh})

//SDP Only
settings.register("freeInfluence", {value: 1, name: "Free Influence",
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("investigationPower", {value: "Role", name: "Investigation Power", 
  values: ["Role", "Role + Bank", "Role + Bank + Cards"],
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("bribeInfo", {value: "None", name: "Briber Information",
  values: ["None", "On Acceptance", "Before Acceptance", "Public Bribes", "Show True Government"],
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("showVoting", {value: "Direction", name: "Show Voting",
  values: ["Anonymous", "Direction", "Value"],
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("voteCostScaling", {value: "3^n", name: "Vote Cost Scaling",
  values: ["1", "n^2", "2^n", "3^n"],
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("pokerHands", {value: 1, name: "Hands Per Round", min: 1,
  activeIf: () => settings.getString("gameMode") === "SDP"})
settings.register("libertarianPolicyCount", {value: 0, name: "Libertarian Policies", min: 0, max: 3000,
  activeIf: () => settings.getString("gameMode") === "SDP", hostOnly: true})  
settings.register("bloodPact", {value: false, name: "Blood Pact",
  activeIf: () => settings.getString("gameMode") === "SDP", hostOnly: true})
settings.register("bloodPactBreak", {value: "35", name: "BP Violation Penalty", values: ["5", "10", "15", "30", "50",
                  "75", "death"], activeIf: () => settings.getBool("bloodPact"), hostOnly: true})

//SD 
settings.register("fPolicyCount", {value: 11, name: "Fascist Policy Cards",
activeIf: () => settings.getString("gameMode") !== "P"})
settings.register("lPolicyCount", {value: 6, name: "Fascist Policy Cards",
activeIf: () => settings.getString("gameMode") !== "P"})
settings.register("dictatorWin", {value: "Classic", name: "Dictator Win Rule",
  values: ["Classic", "No Dictator Win", "Dictator Election Required"],
  activeIf: () => settings.getString("gameMode") !== "P"})
settings.register("sdTimed", {value: false, name: "Timed Secret Dictator",
  activeIf: () => settings.getString("gameMode") !== "P"})
settings.register("sdTime", {value: 60, name: "Secret Dictator Time Limit", min: 1, max: 3000,
  activeIf: () => settings.getBool("sdTimed") && settings.getString("gameMode") !== "P"})

//P
settings.register("pokerType", {value: "Texas Hold'em", name: "Poker Variant",
  values: ["Texas Hold'em", "Omaha",/* "5 Card Draw",*/ "7 Card Stud"],
  activeIf: () => settings.getString("gameMode") !== "SD"})
settings.register("startingBank", {value: 200, name: "Starting Bank",
  activeIf: () => settings.getString("gameMode") !== "SD"})
settings.register("BB", {value: 2, name: "Big Blind", 
  activeIf: () => settings.getString("pokerType") !== "7 Card Stud" &&
  settings.getString("gameMode") !== "SD"
})
settings.register("ante", {value: 1, name: "Ante", 
  activeIf: () => settings.getString("pokerType") === "7 Card Stud" &&
  settings.getString("gameMode") !== "SD"
})
settings.register("bet", {value: 4, name: "Small Bet", 
  activeIf: () => settings.getString("pokerType") === "7 Card Stud" &&
  settings.getString("gameMode") !== "SD"
})
settings.register("pokerTimed", {value: false, name: "Timed Poker", activeIf:
  () => settings.getString("gameMode") !== "SD"})
settings.register("pokerTime", {value: 30, name: "Poker Time Limit", min: 1, max: 120,
  activeIf: () => settings.getBool("pokerTimed") && settings.getString("gameMode") !== "SD"})


settings.register("debug", {value: false, name: "Debug Mode"})
settings.register("debugActionLog", {value: false, name: "Show Hidden Actions", local: true,
  activeIf: () => settings.getBool("debug"), onChange: refresh
})

settings.register("font", {value: true, name: "Fraktur", local: true, onChange: (value: boolean) => {
  const newFont = value ? "UnifrakturCook" : "Helvetica"
  document.documentElement.style.setProperty('--main-font', newFont)
  refresh()
}})

settings.register("4ColorDeck", {value: true, name: "4 Color Deck", local: true, onChange: refresh})
settings.register("showActionLog", {value: true, name: "Show Action Log", local: true,
  onChange: refresh})
settings.register("showSDLog", {value: true, name: "Show SD Log", local: true, onChange: refresh,
  activeIf: () => gameMode() !== "P"})


export default settings
