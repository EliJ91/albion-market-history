import React from 'react';
import './TopBar.css';

const TopBar = ({ onNavigate, activeTab }) => {
  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <div className="logo-section">
          <h1>Albion Market History</h1>
        </div>
        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('dashboard')}
              >
                Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'market-history' ? 'active' : ''}`}
                onClick={() => onNavigate('market-history')}
              >
                Market History
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'api-demo' ? 'active' : ''}`}
                onClick={() => onNavigate('api-demo')}
              >
                API Demo
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'items' ? 'active' : ''}`}
                onClick={() => onNavigate('items')}
              >
                Items
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => onNavigate('settings')}
              >
                Settings
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default TopBar;
