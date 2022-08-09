import SocketIO from 'socket.io'

let settings = {
  settings: new Map<string, {value: number | boolean | string, name: string, values?: string[], max?: number, min?: number}>(),
  getNumber(key : string){
    const value = this.settings.get(key)?.value
    if(typeof value === 'undefined') throw Error('Setting ' + key + ' not found!')
    if(typeof value !== "number") throw Error("Settings field " + key + " is not a number")
    return value
  },
  getString(key : string){
    const value = this.settings.get(key)?.value
    if(typeof value === 'undefined') throw Error('Setting ' + key + ' not found!')
    if(typeof value !== "string") throw Error("Settings field " + key + " is not a string")
    return value
  },
  getBool(key : string){
    const value = this.settings.get(key)?.value
    if(typeof value === 'undefined') throw Error('Setting ' + key + ' not found!')
    if(typeof value !== "boolean") throw Error("Settings field " + key + " is not a bool")
    return value
  },
  getName(key: string){
    const value = this.settings.get(key)?.value
    if(typeof value === 'undefined') throw Error('Setting ' + key + ' not found!')
    return this.settings.get(key)?.name as string
  },
  set(key : string, value : number | boolean | string, socket : SocketIO.Socket | undefined = undefined, lobby : string | undefined = undefined){
    let s = this.settings.get(key) 
    if(s !== undefined){
      if(typeof s.value === "number"){
        if(value < (s.min || 0)) value = s.min || 0
        if(value > (s.max || 1e6)) value = s.max || 1e6
      }
      if(typeof s.value === "string"){
        if(s.values && !s.values.includes(s.value)){
          throw Error("Invalid setting value for " + key + ": " + value)
        }
      }
      if(socket !== undefined){
        socket.emit('changeSetting', lobby, key, value)
      }
      else{
        s.value = value
      }
    }
  },
  register(key : string, val: {value : number | boolean | string, name : string, values?: string[], max?: number, min?: number}){
    this.settings.set(key, val)
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

settings.register("freeInfluence", {value: 200, name: "Free Influence"})
settings.register("ecoBase", {value: 200, name: "Passive Income"})
settings.register("startingBank", {value: 5000, name: "Starting Bank"})
settings.register("BB", {value: 50, name: "Big Blind"})
settings.register("fPolicyCount", {value: 11, name: "Fascist Policy Cards"})
settings.register("lPolicyCount", {value: 6, name: "Fascist Policy Cards"})
settings.register("investigationPower", {value: "Role", name: "Investigation Power", 
  values: ["Role", "Role + Bank", "Role + Bank + Cards"]})
settings.register("debug", {value: true, name: "Debug Mode"})
settings.register("bribeInfo", {value: "None", name: "Briber Information",
  values: ["None", "On Acceptance", "Before Acceptance", "Public Bribes", "Show True Government"]}) 
settings.register("showVoting", {value: "Direction", name: "Show Voting",
  values: ["Anonymous", "Direction", "Value"]})

export default settings