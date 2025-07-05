import React from 'react';
import './MainContent.css';

const MainContent = ({ children }) => {
  return (
    <div className="main-content">
      <div className="content-container">
        {children}
      </div>
    </div>
  );
};

export default MainContent;
