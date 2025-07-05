import React from 'react';
import './App.css';
import TopBar from './components/TopBar';
import MarketData from './components/MarketData';

function App() {
  return (
    <div className="App">
      <TopBar />
      <div className="component-area">
        <MarketData />
      </div>
    </div>
  );
}

export default App;
