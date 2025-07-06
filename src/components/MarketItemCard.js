import React, { useState } from 'react';
import PriceChart from './PriceChart';
import './MarketItemCard.css';

const MarketItemCard = ({ item, marketData, allCities, onClose }) => {
  // Each card manages its own filters
  const [selectedCities, setSelectedCities] = useState(allCities);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1w');
  const [selectedQuality, setSelectedQuality] = useState(1);

  return (
    <div className="market-item-card">
      {/* Close button */}
      <button
        onClick={onClose}
        className="close-btn"
        aria-label="Close"
      >
        ×
      </button>
      <h3 className="market-item-title">{item?.LocalizedNames?.['EN-US'] || item?.UniqueName || item?.key}</h3>
      <PriceChart
        allData={marketData}
        allCities={allCities}
        selectedCities={selectedCities}
        setSelectedCities={setSelectedCities}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
        item={item}
      />
    </div>
  );
};

export default MarketItemCard;
