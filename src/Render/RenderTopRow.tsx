import React from 'react'
interface RenderRowElementArgs{
  offset: string
}
let rowElements: React.FunctionComponent<RenderRowElementArgs>[] = [];
let showConditions: (() => boolean)[] = [];

/**
 * Registers a component to be rendered in the top row of the game.
 * Clicking on the icon will either toggle the rendering of element or
 * call the onClick function.
 * showCondition allows conditionally hiding or showing the icon.
 * Intended use is instructions for expansion modes and local settings.
 */
export function RegisterRowElement(name: string, element?: React.FunctionComponent,
  showCondition?: () => boolean, onClick?: () => void){
 rowElements.push(
    function RowElement(args: RenderRowElementArgs){
      console.log(args.offset)
      const [opened, setOpened] = React.useState(false)
      return <div className = "inLineRow">
        {(showCondition === undefined ||  showCondition()) && <div className = "gear"
            style = {{"left": args.offset}}
            onClick = {
              () => {
                if(!onClick) setOpened(!opened)
                else onClick()
              }
            }>
          {name}
        </div>}
        <div className = "transparent gear" 
          style = {{"top": "50px","position": "absolute"}}>
          {opened && element && React.createElement(element)}
        </div>
      </div>
    }
 )
 if(showCondition) showConditions.push(showCondition)
 else showConditions.push(() => true)
}

export function RenderTopRow() {
  return rowElements.map((element, index) => {
    if(showConditions[index]) return React.createElement(element, {offset: (10 + index * 30) + 'px'})
  })
}
