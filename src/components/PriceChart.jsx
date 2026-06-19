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
import { getCityColor, getHistoryPointKey, getLocationLabel } from '../utils/marketData';

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
  ignoredPointKeys = new Set(),
  locations,
  locationsWithData,
  metric,
  recommendedLocation,
  onToggleLocation,
  onTogglePoint,
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
      data: entry.data.map((point) => {
        const pointKey = getHistoryPointKey(entry.location, point.timestamp);
        return {
          x: new Date(point.timestamp).getTime(),
          y: point[metric],
          avgPrice: point.avg_price,
          ignored: ignoredPointKeys.has(pointKey),
          itemCount: point.item_count,
          pointKey,
        };
      }),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointBackgroundColor: (context) => context.raw?.ignored ? '#94a3b8' : color,
      pointBorderColor: (context) => context.raw?.ignored ? '#475569' : color,
      pointBorderWidth: (context) => context.raw?.ignored ? 2 : 1,
      pointHitRadius: 8,
      pointRadius: (context) => context.raw?.ignored ? 4 : 2.5,
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
    onHover: (event, _elements, chart) => {
      const hoveredPoints = chart.getElementsAtEventForMode(
        event,
        'nearest',
        { intersect: true },
        false,
      );
      chart.canvas.style.cursor = hoveredPoints.length ? 'pointer' : 'crosshair';
    },
    onClick: (event, elements, chart) => {
      const clickedElements = chart.getElementsAtEventForMode?.(
        event,
        'nearest',
        { intersect: true },
        false,
      ) || elements;
      const clicked = clickedElements[0];
      if (!clicked) return;
      const point = chart.data.datasets[clicked.datasetIndex]?.data[clicked.index];
      if (point?.pointKey) onTogglePoint?.(point.pointKey);
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (items) => formatDate(items[0].raw.x),
          label: (context) => {
            const point = context.raw;
            const status = point.ignored ? 'Ignored, click to include' : 'Included, click to ignore';
            return `${getLocationLabel(context.dataset.label)}: ${point.avgPrice.toLocaleString()} silver, ${point.itemCount.toLocaleString()} items (${status})`;
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
        <p className="chart-point-help">Click a plotted point to include or ignore it.</p>
      </div>
      <div className="chart-canvas" ref={chartCanvasRef}>
        {history.length > 0
          ? <Line data={{ datasets }} options={options} ref={chartRef} />
          : <div className="chart-empty">No visible city has data for the selected filters.</div>}
      </div>
    </div>
  );
}
