export function getCardString(c : number){
  let color = ['black', 'red', 'red', 'black'][Math.floor(c / 13)]
  return <span style = {{color: color}}>
    {["2","3","4","5","6","7","8","9","T","J","Q","K","A"][c % 13] + 
      ["♣","♦","♥","♠"][Math.floor(c / 13)]}
  </span>
}