import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Market Dashboard</h2>
        <p>Welcome to Albion Market History - Your central hub for market data analysis</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Recent Market Activity</h3>
          <p>Track the latest market movements and price changes across all items.</p>
          <div className="card-stats">
            <span className="stat-number">1,247</span>
            <span className="stat-label">Recent Transactions</span>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Top Traded Items</h3>
          <p>See which items are currently most popular in the marketplace.</p>
          <div className="card-stats">
            <span className="stat-number">89</span>
            <span className="stat-label">Active Items</span>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Price Alerts</h3>
          <p>Set up notifications for when item prices reach your target levels.</p>
          <div className="card-stats">
            <span className="stat-number">12</span>
            <span className="stat-label">Active Alerts</span>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Market Trends</h3>
          <p>Analyze long-term trends and seasonal patterns in the market.</p>
          <div className="card-stats">
            <span className="stat-number">+15%</span>
            <span className="stat-label">Weekly Growth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
