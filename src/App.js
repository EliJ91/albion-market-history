import React, { useState } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import MainContent from './components/MainContent';
import Dashboard from './components/Dashboard';
import MarketHistory from './components/MarketHistory';
import ApiDemo from './components/ApiDemo';

function App() {
  const [currentComponent, setCurrentComponent] = useState('api-demo');

  const renderComponent = () => {
    switch (currentComponent) {
      case 'dashboard':
        return <Dashboard />;
      case 'market-history':
        return <MarketHistory />;
      case 'api-demo':
        return <ApiDemo />;
      case 'items':
        return <div className="placeholder">Items Component - Coming Soon!</div>;
      case 'settings':
        return <div className="placeholder">Settings Component - Coming Soon!</div>;
      default:
        return <ApiDemo />;
    }
  };

  return (
    <div className="App">
      <TopBar onNavigate={setCurrentComponent} activeTab={currentComponent} />
      <MainContent>
        {renderComponent()}
      </MainContent>
    </div>
  );
}

export default App;
