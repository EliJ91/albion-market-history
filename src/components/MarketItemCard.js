import React, { useState } from 'react';
import PriceChart from './PriceChart';

const MarketItemCard = ({ item, marketData, allCities, onClose }) => {
  // Each card manages its own filters
  const [selectedCities, setSelectedCities] = useState(allCities);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1w');
  const [selectedQuality, setSelectedQuality] = useState(1);

  return (
    <div className="market-item-card" style={{ position: 'relative', background: '#232b3b', borderRadius: 10, margin: 12, padding: 16, boxShadow: '0 2px 8px #0002', maxWidth: 520 }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: '#f56565', fontSize: 22, cursor: 'pointer', fontWeight: 'bold', zIndex: 2 }}
        aria-label="Close"
      >
        ×
      </button>
      <h3 style={{ marginBottom: 8 }}>{item?.LocalizedNames?.['EN-US'] || item?.UniqueName || item?.key}</h3>
      <PriceChart
        allData={marketData}
        allCities={allCities}
        selectedCities={selectedCities}
        setSelectedCities={setSelectedCities}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
      />
    </div>
  );
};

export default MarketItemCard;
