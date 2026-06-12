import {
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { SPECIAL_MARKET_LOCATIONS } from '../config';
import { getCityColor, getLocationLabel } from '../utils/marketData';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip);

const SPECIAL_MARKET_LOCATION_SET = new Set(SPECIAL_MARKET_LOCATIONS);

function compactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function PriceChart({
  history,
  locations,
  locationsWithData,
  metric,
  recommendedLocation,
  onToggleLocation,
  selectedLocations,
}) {
  const chartRef = useRef(null);
  const chartCanvasRef = useRef(null);

  useEffect(() => {
    const chartCanvas = chartCanvasRef.current;
    if (!chartCanvas || typeof ResizeObserver === 'undefined') return undefined;

    let animationFrame;
    const resizeChart = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => chartRef.current?.resize());
    };
    const resizeObserver = new ResizeObserver(resizeChart);

    resizeObserver.observe(chartCanvas);
    resizeChart();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  const datasets = history.map((entry) => {
    const color = getCityColor(entry.location);

    return {
      label: entry.location,
      data: entry.data.map((point) => ({
        x: new Date(point.timestamp).getTime(),
        y: point[metric],
        avgPrice: point.avg_price,
        itemCount: point.item_count,
      })),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 1.5,
      pointHoverRadius: 5,
      tension: 0.2,
    };
  });

  const options = {
    animation: false,
    maintainAspectRatio: false,
    parsing: false,
    responsive: true,
    interaction: { intersect: false, mode: 'nearest' },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (items) => formatDate(items[0].raw.x),
          label: (context) => {
            const point = context.raw;
            return `${getLocationLabel(context.dataset.label)}: ${point.avgPrice.toLocaleString()} silver, ${point.itemCount.toLocaleString()} items`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 8,
          callback: formatDate,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { color: '#94a3b8', callback: compactNumber },
      },
    },
    layout: {
      padding: { top: 8 },
    },
  };

  const locationData = new Set(locationsWithData);
  const visibleLocations = new Set(selectedLocations);
  const regularLocations = locations.filter(
    (location) => !SPECIAL_MARKET_LOCATION_SET.has(location),
  );
  const specialLocations = [
    'Black Market',
    ...SPECIAL_MARKET_LOCATIONS.filter((location) => location !== 'Black Market'),
  ].filter((location) => locations.includes(location));

  function renderLocation(location) {
    const hasData = locationData.has(location);
    const isVisible = visibleLocations.has(location);
    const isRecommended = location === recommendedLocation;
    const label = getLocationLabel(location);
    const status = !hasData ? 'no-data' : isVisible ? 'visible' : 'hidden';
    const title = !hasData
      ? `${label}: no data is available for the selected filters.`
      : isRecommended
        ? `${label}: recommended for the selected display. Click to hide it.`
        : isVisible
          ? `${label}: visible on the chart. Click to hide it.`
          : `${label}: hidden from the chart. Click to show it.`;

    return (
      <button
        aria-disabled={!hasData}
        className={`chart-legend-item ${status}${isRecommended ? ' recommended-city' : ''}`}
        key={location}
        onClick={() => hasData && onToggleLocation?.(location)}
        title={title}
        type="button"
      >
        <span
          className="chart-legend-dot"
          style={{ '--city-color': getCityColor(location) }}
        />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-legend" aria-label="City visibility and recommendation">
        <div className="chart-legend-row">{regularLocations.map(renderLocation)}</div>
        <div className="chart-legend-row chart-legend-special-row">
          {specialLocations.map(renderLocation)}
        </div>
      </div>
      <div className="chart-canvas" ref={chartCanvasRef}>
        {history.length > 0
          ? <Line data={{ datasets }} options={options} ref={chartRef} />
          : <div className="chart-empty">No visible city has data for the selected filters.</div>}
      </div>
    </div>
  );
}
