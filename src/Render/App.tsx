import Game from "./RenderGame"
import './App.css';
require("../Model/Poker")
require("../Model/SecretDictator")

//
//      <header className="App-header"> </header>
//



function App() {
  return (    
    <div className="App">
      <header className="App-header"><Game/> </header>
    </div>
  );
}

export default App;
