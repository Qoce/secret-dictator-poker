import ActionArgs from "../Interface/Action"
import Actions from "./Actions"
import Game from "./Game"
import Phase from "../Interface/Phase"
import Player from "../Interface/Player"
import Players from "./Players"
import RNG from "./Rng"
import {Team} from "../Interface/Role"
import SDState, {loot, onCheckVotes} from "./SecretDictator"
import BPRole from "../Interface/BPRole"
import { postPokerHooks } from "./Poker"
import { Notifier } from "../Render/RenderNotificationText"
import Settings from "../Model/Settings"

export function inPact(p: Player){
  return [BPRole.Founder, BPRole.Member].includes(p.bpRole)
}

export function pactMembers(){
  return Players.filter(inPact)
}

export let instructions = [
    "Rules:",
    "After a set of poker finishes, but before the nomination, a random player (😈) is " +
    "given the option to pick any other player to ask to form a blood pact" +
    " in the honor of the great devourer.",
    "If the player accepts, the pact forms, otherwise, another randomly "+ 
    "chosen player will get the opportunity to form a pact next round.",
    "Each member(🩸) of the pact has their votes amplified by 1 for each other living member "+
    "of the pact.",
    "But all the pact members must vote in the same direction, or they all die.",
    "In addition, upon the original formation of the pact, a random player " +
    "that is not a pact member is chosen to be the investigator (🧐).",
    "If the pact is founded between two fascists, the investigator will be " +
    "a liberal.",
    "All pact members know the identity of the investigator.",
    "Once the pact is formed, the pact's founder has the option "+
    "to invite an additional player to join the pact as an action "+
    "after a poker set.",
    "The invitee will be told the identities of all pact members prior to " +
    "making their decision.",
    "After this invitation process is complete, the investigator has the option " +
    "to accuse any other player of being a pact member.",
    "If the investigator is correct, the pact is destroyed and all members cede " +
    "35% of their bank to the investigator.",
    "If the investigator is wrong, they cede 50% of their bank to the pact.",
    "The investigator may only make one accusation.",
    "The investigator has the ability to accuse even if they have died.",
    "The pact persists if a pact member (including the founder) dies, " + 
    "but the investigator can only accuse living players."
]

function startBloodPact(){
  let living = Players.living()
  let mem = living.splice(RNG.nextInt(living.length), 1)[0]
  mem.bpRole = BPRole.Founder
  Actions.log({
    content: [mem, " may attempt to found a blood pact"],
    visibleTo: Players.players.indexOf(mem)
  })

  Notifier.customNotify({
    s: ["A player now has the opportunity to form a blood pact."].concat(instructions),
    ok: true
  })
}

Game.setPhaseListener(Phase.bloodpactPropose, () => {
  if(Players.filter(p => p.bpRole !== BPRole.None).length === 0){
    startBloodPact()
  }
  Players.setActors(p => p.bpRole === BPRole.Founder)
  Players.apply(p => p.targetable = p.bpRole === BPRole.None)
})

Actions.register(Phase.bloodpactPropose, (args: ActionArgs) => {
  if(args.t !== undefined){
    Players.get(args.t).bpRole = BPRole.Invited
    Actions.log({
      content: [Players.get(args.p), " has invited ", Players.get(args.t), 
        " to join their blood pact"],
      visibleTo: [args.p, args.t]
    })
    return Game.setPhase(Phase.bloodpactView)
  }
  Actions.log({
    content: [Players.get(args.p), 
      " has declined to found or grow their blood pact"],
    visibleTo: args.p
  })
  if(Players.filter(p => p.bpRole === BPRole.Member).length === 0){
    Players.apply(p => p.bpRole = BPRole.None)
  }
  return Game.setPhase(Phase.bloodpactAccuse)
})

function pactFounded(){
  return Players.filter(p => p.bpRole === BPRole.Member)[0]
}

Game.setPhaseListener(Phase.bloodpactView, () => {
  Players.setActors(p => p.bpRole === BPRole.Invited)
  Players.apply(p => p.targetable = false)
})

//TODO:
//Special blood pact win condition for total inv bamboozle
//Decide where these phases are inserted and proeperly exit them
Actions.register(Phase.bloodpactView, (args: ActionArgs) => {
  let accepted = args.v !== 0
  let p = Players.get(args.p)
  let founder = Players.filter(p => p.bpRole === BPRole.Founder)[0]
  if(accepted){
    let pf = pactFounded()
    p.bpRole = BPRole.Member
    Actions.log({content: 
      [p , " has joined the blood pact founded by ", founder],
      visibleTo: pactMembers().map(n => Players.players.indexOf(n))}
    )
    if(!pf){
      let eligible = Players.filter(p => p.bpRole === BPRole.None)
      if(Players.get(args.p).role.team !== Team.liberal && 
        Players.filter(p => p.bpRole === BPRole.Founder)[0].role.team
        !== Team.liberal){
        eligible = eligible.filter(p => p.role.team === Team.liberal)    
      }
      eligible[RNG.nextInt(eligible.length)].bpRole = BPRole.Investigator
    }
  }
  else{
    Actions.log({content: 
      [p , " has rejected the blood pact invitation from ", founder],
      visibleTo: [args.p, Players.players.indexOf(founder)]}
    )
    if(!pactFounded()){
      //Failed to form a pact. New player will get the opportunity
      Players.apply(p => p.bpRole = BPRole.None)
    }
    else{
      Players.get(args.p).bpRole = BPRole.None
    }
  }
  if(Players.any(p => p.bpRole === BPRole.Investigator)){
    return Game.setPhase(Phase.bloodpactAccuse)
  } 
  return Game.setPhase(Phase.nominate)
})


Game.setPhaseListener(Phase.bloodpactAccuse, () => {
  let ins = Players.filter(p => p.bpRole === BPRole.Investigator)
  if(ins.length === 0) return Game.setPhase(Phase.nominate)
  Players.setActors(p => p.bpRole === BPRole.Investigator, true)
  Players.apply(p => p.targetable = p.bpRole !== BPRole.Investigator &&
    !p.dead)
})

Actions.register(Phase.bloodpactAccuse, (args: ActionArgs) => {
  if(args.t !== undefined){
    let t = Players.get(args.t)
    let p = Players.get(args.p)
    let playersInPact = pactMembers()
    Actions.log([p, "has accused ", Players.get(args.t), 
      " of being a member of the blood pact."])
    if(t.bpRole === BPRole.None){
      Actions.log([t, " was innocent. ", p, "'s goose is cooked!"])
      loot(playersInPact, [p], 0.5)
      p.bpRole = BPRole.DefeatedInvestigator
    }
    else{
      Actions.log([t, " was a member of the pact. The pact has been exposed!"])
      Notifier.customNotify({
        s: "Xar' Ah has been expelled.",
        timeout: 5000
      })
      loot([p], playersInPact, 0.35)
      for(let pacter of playersInPact){
        pacter.bpRole = BPRole.None
      }
      p.bpRole = BPRole.VictoriousInvestigator
    }
  }
  else Actions.log("The investigator has declined to accuse anyone.")
  return Game.setPhase(Phase.nominate)
})

postPokerHooks.hooks.push({
  priority: -5,
  hook: (_: number) => {
    if(SDState().bpPassed){
      if(Players.any(p => p.bpRole === BPRole.VictoriousInvestigator)){
        return false
      }
      if(Players.living().length <= 3) return false
      if(Players.all(p => p.bpRole === BPRole.None)){
        return Game.setPhase(Phase.bloodpactPropose)
      }
      if(Players.any(p => p.bpRole === BPRole.Founder)){
        if(!Players.filter(p => p.bpRole === BPRole.Founder)[0].dead){
          return Game.setPhase(Phase.bloodpactPropose)
        }
      }
      if(Players.any(p => p.bpRole === BPRole.Investigator)){
        return Game.setPhase(Phase.bloodpactAccuse)
      }
    }
    return false
  }
})

onCheckVotes.hooks.push(() => {
  let votes = [] as boolean[]
  let livingMembers = pactMembers().filter(p => !p.dead)
  let livingOthers = Players.living().filter(p => !pactMembers().includes(p))
  for(let p of livingMembers){
    if(!votes.includes(p.role.vote!)){
      votes.push(p.role.vote!)
    }
  }
  if(votes.length === 1){
    livingMembers.map(p => p.role.spent += livingMembers.length - 1)
  }
  else if(votes.length === 2){
    Actions.log("The blood pact has been broken! Xar 'Ah is most displeased.")
    let penalty = Settings.getString("bloodPactBreak")
    if(penalty === "kill"){
      livingMembers.map(p => p.dead = true)
      Players.onKill()
    }
    else{
      loot(livingOthers, livingMembers, parseInt(penalty) / 100,
          (p: Player) => p.role.influence, (p: Player, n: number) => p.role.influence = n)
    }
  }
})
