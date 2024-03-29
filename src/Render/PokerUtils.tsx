import Settings from "../Model/Settings"

export function getCardString(c : number){
  const colors = !Settings.getBool("4ColorDeck") ? ["black", "red", "red", "black"] :
     ["green", "blue", "red", "black"] 
  let color = colors[Math.floor(c / 13)]
  return <span style = {{color: color}} key = {c}>
    {["2","3","4","5","6","7","8","9","T","J","Q","K","A"][c % 13] + 
      ["♣","♦","♥","♠"][Math.floor(c / 13)]}
  </span>
}
export function renderNet(net : number){
  let str : string = "" + net
  if(net > 0) str = "+" + str
  let color = net > 0 ? "green" : "red"
  if(net === 0) color = "black"
  
  return  <span style = {{color: color}}>
    {str}
  </span>
}