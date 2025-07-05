import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { CITIES, QUALITIES } from '../services/AlbionAPI';
import './PriceChart.css';

const PriceChart = ({ historyData, selectedItem, onTimeScaleChange, currentTimeScale }) => {
  const [chartType, setChartType] = useState('price'); // 'price', 'volume', 'combined'
  const [selectedCities, setSelectedCities] = useState(Object.keys(CITIES)); // Show all cities by default

  // Process the history data for chart display
  const processChartData = (data, timeScale) => {
    if (!data || !data[timeScale]) return [];
    
    const timePoints = new Map();
    
    // Process each city's data from the API response
    Object.entries(data[timeScale]).forEach(([cityName, cityHistory]) => {
      // Process all cities regardless of selection (filter on display, not data processing)
      cityHistory.forEach(dataPoint => {
        const timestamp = new Date(dataPoint.timestamp).getTime();
        const dateKey = timeScale === 1 
          ? new Date(dataPoint.timestamp).toLocaleString('en-US', { 
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            })
          : new Date(dataPoint.timestamp).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric' 
            });
        
        if (!timePoints.has(timestamp)) {
          timePoints.set(timestamp, {
            timestamp,
            date: dateKey,
            dateObj: new Date(dataPoint.timestamp)
          });
        }
        
        const timePoint = timePoints.get(timestamp);
        
        // Use city name as key for data points
        timePoint[`${cityName}_avgPrice`] = dataPoint.avg_price || 0;
        timePoint[`${cityName}_volume`] = dataPoint.item_count || 0;
        timePoint[`${cityName}_minPrice`] = dataPoint.min_price || 0;
        timePoint[`${cityName}_maxPrice`] = dataPoint.max_price || 0;
      });
    });
    
    // Convert to array and sort by timestamp
    const sortedData = Array.from(timePoints.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    console.log('Processed chart data:', sortedData.slice(0, 3)); // Debug first 3 entries
    return sortedData;
  };

  const chartData = processChartData(historyData, currentTimeScale);

  const toggleCity = (cityName) => {
    setSelectedCities(prev => 
      prev.includes(cityName) 
        ? prev.filter(c => c !== cityName)
        : [...prev, cityName]
    );
  };

  const renderPriceChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Average Price (Silver)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value, name) => [
            `${Math.round(value).toLocaleString()} silver`,
            name.replace('_avgPrice', '').replace(/([A-Z])/g, ' $1').trim()
          ]}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        {Object.keys(CITIES).filter(cityName => selectedCities.includes(cityName)).map(cityName => {
          const cityConfig = CITIES[cityName];
          return (
            <Line
              key={cityName}
              type="monotone"
              dataKey={`${cityName}_avgPrice`}
              stroke={cityConfig?.color || '#8884d8'}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={cityName}
              connectNulls={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderVolumeChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Volume (Items Sold)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value, name) => [
            `${Math.round(value).toLocaleString()} items`,
            name.replace('_volume', '').replace(/([A-Z])/g, ' $1').trim()
          ]}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        {Object.keys(CITIES).filter(cityName => selectedCities.includes(cityName)).map(cityName => {
          const cityConfig = CITIES[cityName];
          return (
            <Line
              key={cityName}
              type="monotone"
              dataKey={`${cityName}_volume`}
              stroke={cityConfig?.color || '#8884d8'}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={cityName}
              connectNulls={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderCombinedChart = () => (
    <ResponsiveContainer width="100%" height={500}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          yAxisId="price"
          orientation="left"
          tick={{ fontSize: 12 }}
          label={{ value: 'Price (Silver)', angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="volume"
          orientation="right"
          tick={{ fontSize: 12 }}
          label={{ value: 'Volume (Items)', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          formatter={(value, name) => {
            if (name.includes('_volume')) {
              return [`${Math.round(value).toLocaleString()} items`, name.replace('_volume', ' Volume')];
            } else {
              return [`${Math.round(value).toLocaleString()} silver`, name.replace('_avgPrice', ' Price')];
            }
          }}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        {Object.keys(CITIES).filter(cityName => selectedCities.includes(cityName)).map(cityName => {
          const cityConfig = CITIES[cityName];
          return (
            <React.Fragment key={cityName}>
              <Line
                yAxisId="price"
                type="monotone"
                dataKey={`${cityName}_avgPrice`}
                stroke={cityConfig?.color || '#8884d8'}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={`${cityName} Price`}
                connectNulls={false}
              />
              <Bar
                yAxisId="volume"
                dataKey={`${cityName}_volume`}
                fill={cityConfig?.color || '#8884d8'}
                fillOpacity={0.3}
                name={`${cityName} Volume`}
              />
            </React.Fragment>
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (!historyData || !selectedItem) {
    return (
      <div className="chart-placeholder">
        <p>Select an item to view price and volume charts</p>
      </div>
    );
  }

  return (
    <div className="price-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h3>{selectedItem.name} - Market Analysis</h3>
          <p className="chart-subtitle">
            {currentTimeScale === 1 ? 'Hourly' : 'Daily'} price and volume data
          </p>
        </div>
        
        <div className="chart-controls">
          <div className="time-scale-controls">
            <label>Time Scale:</label>
            <div className="time-scale-buttons">
              <button
                className={`time-scale-btn ${currentTimeScale === 1 ? 'active' : ''}`}
                onClick={() => onTimeScaleChange(1)}
              >
                1 Hour
              </button>
              <button
                className={`time-scale-btn ${currentTimeScale === 24 ? 'active' : ''}`}
                onClick={() => onTimeScaleChange(24)}
              >
                1 Day
              </button>
            </div>
          </div>
          
          <div className="chart-type-controls">
            <label>Chart Type:</label>
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)}
              className="chart-type-select"
            >
              <option value="price">Price Only</option>
              <option value="volume">Volume Only</option>
              <option value="combined">Price & Volume</option>
            </select>
          </div>
        </div>
      </div>

      <div className="city-filters">
        <label>Cities:</label>
        <div className="city-filter-buttons">
          {Object.entries(CITIES).map(([cityName, cityConfig]) => (
            <button
              key={cityName}
              className={`city-filter-btn ${selectedCities.includes(cityName) ? 'active' : ''}`}
              onClick={() => toggleCity(cityName)}
              style={{
                borderColor: selectedCities.includes(cityName) ? cityConfig.color : '#e1e5e9',
                backgroundColor: selectedCities.includes(cityName) ? cityConfig.color : 'white',
                color: selectedCities.includes(cityName) ? 'white' : cityConfig.color
              }}
            >
              <span className="city-icon" style={{ backgroundColor: cityConfig.color }}>
                {cityConfig.icon}
              </span>
              {cityName}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-content">
        {chartType === 'price' && renderPriceChart()}
        {chartType === 'volume' && renderVolumeChart()}
        {chartType === 'combined' && renderCombinedChart()}
      </div>

      {chartData.length === 0 && (
        <div className="no-data-message">
          <p>No chart data available for the selected item and time period.</p>
        </div>
      )}
    </div>
  );
};

export default PriceChart;
