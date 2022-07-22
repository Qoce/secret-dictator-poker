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
  set(key : string, value : number | boolean | string){
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
      s.value = value
    }
  },
  register(key : string, val: {value : number | boolean | string, name : string, values?: string[], max?: number, min?: number}){
    this.settings.set(key, val)
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
settings.register("showGov", {value: false, name: "Show True Government"}) //merge with seeBriber
settings.register("seeBriber", {value: false, name: "See Briber Identity"}) //TODO: maybe make this an enum: never, after, before, everyone

export default settings