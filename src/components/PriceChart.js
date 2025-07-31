import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale, // <-- ADD THIS
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // <-- ADD THIS for date support
import './PriceChart.css';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale, // <-- ADD THIS
  Title,
  Tooltip,
  Legend
);


// City color mapping
const CITY_COLORS = {
  Caerleon: '#D7263D', // Red
  Bridgewatch: '#FFD166', // Sand Yellow
  Lymhurst: '#228B22', // Forest Green
  Martlock: '#1E90FF', // Ocean Blue
  Thetford: '#8F43B7', // Violet purple
  'Fort Sterling': '#FFFFFF', // White
  'Black Market': '#676767', // Black
};
// Fallback colors for any other cities
const COLORS = [
  '#D7263D', // Caerleon
  '#FFD166', // Bridgewatch
  '#228B22', // Lymhurst
  '#1E90FF', // Martlock
  '#8F43B7', // Thetford (violet purple)
  '#FFFFFF', // Fort Sterling (white)
  '#222222', // Black Market (black)
  '#667eea', '#f56565', '#48bb78', '#ed8936', '#38b2ac', '#a0aec0', '#ecc94b', '#9f7aea', '#f6ad55', '#68d391'
];

const QUALITIES = [1, 2, 3, 4, 5];

const PriceChart = ({ allData, selectedTimeRange, selectedQuality, onQualityChange, item, selectedCities, chartValue = 'avg_price' }) => {
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

  // --- FILTER LOGIC ---
  // Always filter by selected quality (default 1) and selected cities
  const filteredQuality = selectedQuality == null ? 1 : selectedQuality;
  const datasets = [];
  allData.forEach(entry => {
    if (
      (!selectedCities || selectedCities.includes(entry.location)) &&
      (entry.quality === filteredQuality || entry.quality === 0) // Show averaged data if present
    ) {
      datasets.push({
        label: entry.location,
        data: entry.data.map(d => ({
          x: d.timestamp,
          y: chartValue === 'avg_price' ? d.avg_price : d.item_count,
          item_count: d.item_count,
          avg_price: d.avg_price
        })),
        fill: false,
        borderColor: CITY_COLORS[entry.location] || COLORS[datasets.length % COLORS.length],
        backgroundColor: CITY_COLORS[entry.location] || COLORS[datasets.length % COLORS.length],
        pointRadius: 2,
        tension: 0.2,
      });
    }
  });

  // Chart.js expects labels for category scale, but with x/y objects, we use x as timestamp
  const chartJsData = {
    datasets,
  };

  // Helper to abbreviate price values
  function abbreviateNumber(value) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return value.toString();
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          title: function() { return ''; }, // Remove the default title (which is the x value)
          label: function(context) {
            const d = new Date(context.raw.x);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            // Find all points for this city and this UTC date
            const city = context.dataset.label;
            const hoveredDate = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
            let sumPrice = 0;
            let found = false;
            if (Array.isArray(allData)) {
              const cityData = allData.find(entry => entry.location === city);
              if (cityData && Array.isArray(cityData.data)) {
                const pointsForDay = cityData.data.filter(pt => {
                  const ptDate = new Date(pt.timestamp);
                  const ptDateStr = ptDate.getUTCFullYear() + '-' + String(ptDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(ptDate.getUTCDate()).padStart(2, '0');
                  return ptDateStr === hoveredDate;
                });
                if (pointsForDay.length > 0) {
                  found = true;
                  sumPrice = pointsForDay.reduce((acc, pt) => acc + (pt.avg_price || 0), 0);
                }
              }
            }
            if (found) {
              // eslint-disable-next-line no-console
              console.log('Hovered date:', hoveredDate, 'City:', city, 'Sum of prices:', sumPrice);
            }
            return chartValue === 'avg_price'
              ? `${mm}/${dd}  Qty: ${context.raw.item_count}  Price: ${context.raw.y.toLocaleString()}`
              : `${mm}/${dd}  Qty: ${context.raw.y.toLocaleString()}  Price: ${context.raw.avg_price?.toLocaleString?.() ?? ''}`;
          },
        },
      },
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 4,
        hitRadius: 12, // Make points easier to hover, but not visible
        borderWidth: 0, // No border
      },
    },
    scales: {
      x: {
        display: true, // Show x axis
        type: 'time', // Use time scale for correct date mapping
        time: {
          unit: 'day',
          tooltipFormat: 'MM/dd',
          displayFormats: {
            day: 'MM-dd'
          }
        },
        grid: { display: true, color: '#444', lineWidth: 1 }, // Lighten grid lines
        ticks: {
          display: false,
          color: '#aaa',
          font: { size: 11 }
        },
        title: { display: false },
      },
      y: {
        display: true, // Show y axis
        grid: { display: true, color: '#444', lineWidth: 1 }, // Lighten grid lines
        ticks: {
          display: true,
          callback: function(value) {
            return abbreviateNumber(value);
          },
          color: '#aaa',
          font: { size: 11 }
        },
        title: { display: false }
      }
    },
  };

  return (
    <div className="price-chart-container-row minimal-padding">
      <div className="price-chart-container full-width minimal-padding">
        <Line
          data={chartJsData}
          options={chartOptions}
          className="price-chart-canvas"
        />
      </div>
    </div>
  );
};

export default PriceChart;
