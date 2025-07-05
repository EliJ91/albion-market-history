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

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  '#667eea', '#f56565', '#48bb78', '#ed8936', '#38b2ac', '#a0aec0', '#ecc94b', '#9f7aea', '#f6ad55', '#68d391'
];

const PriceChart = ({ allData, allCities, selectedCities, setSelectedCities, selectedTimeRange, setSelectedTimeRange }) => {
  // Time range dropdown options
  const TIME_RANGE_OPTIONS = [
    { label: '1 Day', value: '1d', days: 1 },
    { label: '1 Week', value: '1w', days: 7 },
    { label: '1 Month', value: '1m', days: 30 },
    { label: '3 Months', value: '3m', days: 90 },
  ];

  // Filter data by selected time range (client-side)
  const now = Date.now();
  const selectedOption = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedTimeRange) || TIME_RANGE_OPTIONS[1];
  const minTimestamp = now - selectedOption.days * 24 * 60 * 60 * 1000;

  // Filter data for selected time range
  const cityGroups = {};
  allData.forEach(entry => {
    if (!cityGroups[entry.location]) cityGroups[entry.location] = {};
    Object.keys(entry).forEach(key => {
      if (key === 'quality' || key === 'location' || key === 'item_id') return;
      // Filter entry.data by date
      entry.data = entry.data.filter(d => new Date(d.timestamp).getTime() >= minTimestamp);
      if (!cityGroups[entry.location][entry.quality]) cityGroups[entry.location][entry.quality] = [];
      cityGroups[entry.location][entry.quality].push(...entry.data);
    });
  });

  // For each city, check if it has data (for any quality, since quality is removed)
  const cityHasData = {};
  allCities.forEach(city => {
    cityHasData[city] = cityGroups[city] && Object.values(cityGroups[city]).some(arr => arr.length > 0);
  });

  // Only plot selected cities
  const citiesToPlot = selectedCities;
  const chartData = citiesToPlot.map((city, idx) => {
    // Use all available data for the city (merge all qualities)
    const allCityData = Object.values(cityGroups[city] || {}).flat();
    return {
      city,
      color: COLORS[idx % COLORS.length],
      data: allCityData
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

  const chartJsData = {
    labels: allTimestamps.map(ts => new Date(ts).toLocaleString()),
    datasets,
  };

  return (
    <div style={{background:'rgba(40,60,90,0.18)',borderRadius:8,padding:8,marginBottom:12, maxWidth: 480, width: '100%', minHeight: 220}}>
      {/* Time range selector in chart container */}
      <div style={{display:'flex',alignItems:'center',marginBottom:8, gap: 12}}>
        <label style={{color:'#fff',fontWeight:600}}>Time Range:</label>
        <select value={selectedTimeRange} onChange={e => setSelectedTimeRange(e.target.value)}>
          {TIME_RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          },
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Avg Price' } },
          },
        }}
        height={180}
      />
      {/* City selection grid under the chart */}
      <div className="city-checkbox-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        maxWidth: 480,
        margin: '16px auto 0',
        padding: '8px 0',
      }}>
        {allCities.map((city, idx) => {
          const hasData = cityHasData[city];
          return (
            <label key={city} style={{
              opacity: hasData ? 1 : 0.5,
              cursor: hasData ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 500,
              fontSize: '0.97rem',
            }}>
              <input
                type="checkbox"
                checked={selectedCities.includes(city)}
                disabled={!hasData}
                onChange={() => {
                  if (!hasData) return;
                  setSelectedCities(prev =>
                    prev.includes(city)
                      ? prev.filter(c => c !== city)
                      : [...prev, city]
                  );
                }}
                style={{ accentColor: '#667eea', width: 16, height: 16 }}
              />
              {city}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PriceChart;
