import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './PriceChart.css';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);


// City color mapping
const CITY_COLORS = {
  Bridgewatch: '#FFD166', // desert sand orange/yellow
  'Fort Sterling': '#F8F8FF', // Snow White
  Lymhurst: '#228B22', // Forest Green
  Martlock: '#1E90FF', // Ocean Blue
  Thetford: '#7C4BC9', // Off purple (cape color)
  Caerleon: '#D7263D', // Red
  'Black Market': '#222', // Black
};
// Fallback colors for any other cities
const COLORS = [
  '#FFD166', // Bridgewatch
  '#F8F8FF', // Fort Sterling
  '#228B22', // Lymhurst
  '#1E90FF', // Martlock
  '#7C4BC9', // Thetford (off purple)
  '#D7263D', // Caerleon (red)
  '#222',    // Black Market (black)
  '#667eea', '#f56565', '#48bb78', '#ed8936', '#38b2ac', '#a0aec0', '#ecc94b', '#9f7aea', '#f6ad55', '#68d391'
];

const QUALITIES = [1, 2, 3, 4, 5];

const PriceChart = ({ allData, allCities, selectedCities, setSelectedCities, selectedTimeRange, onTimeRangeChange, selectedQuality, onQualityChange, item }) => {
  // Time range dropdown options
  const TIME_RANGE_OPTIONS = [
    { label: '1 Week', value: '1w', days: 7 },
    { label: '2 Weeks', value: '2w', days: 14 },
    { label: '4 Weeks', value: '4w', days: 28 },
  ];

  // Filter data by selected time range (client-side)
  const now = Date.now();
  const selectedOption = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedTimeRange) || TIME_RANGE_OPTIONS[2];
  const minTimestamp = now - selectedOption.days * 24 * 60 * 60 * 1000;

  // Group all data by city and quality (do not filter by date yet)
  const cityGroups = {};
  allData.forEach(entry => {
    if (!cityGroups[entry.location]) cityGroups[entry.location] = {};
    Object.keys(entry).forEach(key => {
      if (key === 'quality' || key === 'location' || key === 'item_id') return;
      if (!cityGroups[entry.location][entry.quality]) cityGroups[entry.location][entry.quality] = [];
      cityGroups[entry.location][entry.quality].push(...entry.data);
    });
  });

  // For each city, check if it has data for the selected quality
  const cityHasData = {};
  allCities.forEach(city => {
    cityHasData[city] = cityGroups[city] && cityGroups[city][selectedQuality] && cityGroups[city][selectedQuality].length > 0;
  });

  // Only plot selected cities, filter by selected time range here
  const citiesToPlot = selectedCities;
  const chartData = citiesToPlot.map((city, idx) => {
    // Use only data for the selected quality, filter by date here
    const cityQualityData = ((cityGroups[city] && cityGroups[city][selectedQuality]) || []).filter(d => new Date(d.timestamp).getTime() >= minTimestamp);
    // Use mapped color if city is in CITY_COLORS, else fallback to COLORS
    const color = CITY_COLORS[city] || COLORS[idx % COLORS.length];
    return {
      city,
      color,
      data: cityQualityData
    };
  });

  // Find all unique timestamps (x-axis)
  const allTimestamps = Array.from(new Set(
    chartData.flatMap(cityObj => cityObj.data.map(d => d.timestamp))
  )).sort();

  // Prepare datasets for each city
  const datasets = chartData.map((cityObj, idx) => ({
    label: cityObj.city,
    data: allTimestamps.map(ts => {
      const point = cityObj.data.find(d => d.timestamp === ts);
      return point ? point.avg_price : null;
    }),
    fill: false,
    borderColor: cityObj.color,
    backgroundColor: cityObj.color,
    pointRadius: 2,
    tension: 0.2,
  }));

  // Format date as MM-DD
  const chartJsData = {
    labels: allTimestamps.map(ts => {
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}-${dd}`;
    }),
    datasets,
  };

  // Get the item identifier, tier, and enchantment for the image
  let itemIdentifier = null;
  let itemTier = null;
  let itemEnchant = null;
  if (item && item.value) {
    // item.value is like T4_MAIN_SWORD@2 or T4_MAIN_SWORD
    const [main, enchant] = item.value.split('@');
    itemIdentifier = main;
    itemTier = main.split('_')[0];
    itemEnchant = enchant || '0';
  } else if (allData && allData.length > 0) {
    itemIdentifier = allData[0].item_id;
    // fallback: try to parse tier/enchant from item_id
    const match = /^(T\d+)_.*?(?:@(\d+))?$/.exec(itemIdentifier);
    if (match) {
      itemTier = match[1];
      itemEnchant = match[2] || '0';
    }
  }
  let itemImageUrl = null;
  if (itemIdentifier) {
    itemImageUrl = `https://render.albiononline.com/v1/item/${itemIdentifier}`;
    if (itemEnchant && itemEnchant !== '0') {
      itemImageUrl += `@${itemEnchant}`;
    }
    itemImageUrl += `.png`;
  }

  return (
    <div className="price-chart-container-row">
      <div className="price-chart-container">
        {/* Time range, quality, and city selector in chart container */}
        <div className="price-chart-header">
          <label className="price-chart-label">Time Range:</label>
          <select value={selectedTimeRange} onChange={e => onTimeRangeChange(e.target.value)}>
            {TIME_RANGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="price-chart-label quality">Quality:</label>
          <select value={selectedQuality} onChange={e => onQualityChange(Number(e.target.value))}>
            {QUALITIES.map(q => (
              <option key={q} value={q}>Q{q}</option>
            ))}
          </select>
        </div>
        <Line
          data={chartJsData}
          options={{
            responsive: true,
            plugins: {
              legend: { display: true },
              title: { display: false },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: function(context) {
                    // Find the city and timestamp for this point
                    const cityIdx = context.datasetIndex;
                    const cityObj = chartData[cityIdx];
                    const tsIdx = context.dataIndex;
                    const ts = allTimestamps[tsIdx];
                    const point = cityObj.data.find(d => d.timestamp === ts);
                    if (point) {
                      return `${cityObj.city}: ${point.avg_price.toLocaleString()} silver, Qty: ${point.item_count}`;
                    } else {
                      return `${cityObj.city}: No data`;
                    }
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Avg Price' } },
            },
          }}
          className="price-chart-canvas"
        />
      </div>
      {itemImageUrl && (
        <div className="price-chart-item-image-container">
          <img src={itemImageUrl} alt="Item" className="price-chart-item-image" />
        </div>
      )}
    </div>
  );
};



export default PriceChart;
