import Game from "./RenderGame"
import './App.css';
var  WebFont = require('webfontloader');
require("../Model/Poker")
require("../Model/SecretDictator")




function App() {
  return (    
    <div className="App">
      <header className="App-header"><Game/> </header>
    </div>
  );
}

export default App;
