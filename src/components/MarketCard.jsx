import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  QUALITY_LABELS,
  REGIONS,
  SPECIAL_MARKET_LOCATIONS,
  TIME_RANGES,
} from '../config';
import { fetchHistory } from '../services/albionApi';
import { getEnchantment, getItemValue, getTier } from '../utils/itemCatalog';
import {
  filterHistory,
  getLocations,
  getRecommendedLocation,
} from '../utils/marketData';
import { getQualityPriceAverages } from '../utils/reroll';
import RerollMenu from './RerollMenu';
import CraftingProfit from './CraftingProfit';

const PriceChart = lazy(() => import('./PriceChart'));
const silver = new Intl.NumberFormat('en-US');

export default function MarketCard({ card, dragging, onChange, onDragEnd, onDragEnter, onDragStart, onRemove }) {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');

    fetchHistory(card.itemId, card.region, controller.signal)
      .then((data) => {
        setHistory(data);
        setLastUpdated(new Date());
        setStatus(data.length ? 'ready' : 'empty');
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [card.itemId, card.region, refreshKey]);

  const availableLocations = useMemo(
    () => getLocations(history, SPECIAL_MARKET_LOCATIONS),
    [history],
  );
  const selectedLocations = card.locations.length
    ? card.locations.filter((location) => availableLocations.includes(location))
    : availableLocations;

  const availableChartHistory = useMemo(
    () => filterHistory(history, {
      quality: card.quality,
      averageQualities: card.averageQualities,
      locations: availableLocations,
      days: card.days,
    }),
    [history, card.quality, card.averageQualities, card.days, availableLocations.join('|')],
  );
  const chartHistory = useMemo(
    () => availableChartHistory.filter((entry) => selectedLocations.includes(entry.location)),
    [availableChartHistory, selectedLocations.join('|')],
  );
  const recommendedLocation = useMemo(
    () => getRecommendedLocation(chartHistory, card.metric),
    [chartHistory, card.metric],
  );
  const qualityAverages = useMemo(
    () => getQualityPriceAverages(history, {
      days: card.days,
      locations: selectedLocations,
    }),
    [history, card.days, selectedLocations.join('|')],
  );

  function toggleLocation(location) {
    const next = selectedLocations.includes(location)
      ? selectedLocations.filter((current) => current !== location)
      : [...selectedLocations, location];

    if (next.length > 0) onChange({ locations: next });
  }

  const tier = getTier(card.itemId);
  const enchantment = getEnchantment(card.itemId);
  const itemValue = getItemValue(card.itemId);

  return (
    <article
      className={`market-card${dragging ? ' dragging' : ''}`}
      draggable
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        if (event.target.closest('button, input, select, summary')) {
          event.preventDefault();
          return;
        }
        onDragStart();
      }}
    >
      <div className="card-header">
        <div>
          <div className="card-title-line">
            {tier && <span className={`tier-badge tier-${tier}`}>T{tier}</span>}
            <h2>{card.name}</h2>
            {enchantment > 0 && <span className={`enchant-badge enchant-${enchantment}`}>.{enchantment}</span>}
          </div>
          <div className="item-meta">
            <span>{REGIONS[card.region]?.label || card.region}</span>
            <span>Item Value {itemValue == null ? 'unavailable' : silver.format(itemValue)}</span>
            {lastUpdated && (
              <span>
                Refreshed {lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'UTC',
                })} UTC
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          {!card.collapsed && (
            <CraftingProfit
              averageQualities={card.averageQualities}
              days={card.days}
              history={history}
              itemId={card.itemId}
              quality={card.quality}
              region={card.region}
            />
          )}
          {!card.collapsed && (
            <RerollMenu
              currentQuality={card.quality}
              itemValue={itemValue}
              qualityAverages={qualityAverages}
            />
          )}
          {!card.collapsed && (
            <button className="icon-button action-icon" onClick={() => setRefreshKey((value) => value + 1)} title="Refresh data" aria-label="Refresh data" type="button">
              ↻
            </button>
          )}
          <button className="icon-button action-icon" onClick={() => onChange({ collapsed: !card.collapsed })} title={card.collapsed ? 'Expand card' : 'Minimize card'} aria-label={card.collapsed ? 'Expand card' : 'Minimize card'} type="button">
            {card.collapsed ? '□' : '−'}
          </button>
          <button className="icon-button danger action-icon" onClick={onRemove} title="Remove chart" aria-label="Remove chart" type="button">
            ×
          </button>
        </div>
      </div>

      {!card.collapsed && (
        <>
      <div className="card-controls">
        <label>
          Range
          <select value={card.days} onChange={(event) => onChange({ days: Number(event.target.value) })}>
            {TIME_RANGES.map((range) => <option key={range.days} value={range.days}>{range.label}</option>)}
          </select>
        </label>

        <label>
          Quality
          <select
            disabled={card.averageQualities}
            value={card.quality}
            onChange={(event) => onChange({ quality: Number(event.target.value) })}
          >
            {Object.entries(QUALITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label>
          Display
          <select value={card.metric} onChange={(event) => onChange({ metric: event.target.value })}>
            <option value="avg_price">Price</option>
            <option value="item_count">Volume</option>
          </select>
        </label>

        <label className="checkbox-control" title="Combine all item qualities into one average.">
          <input
            checked={card.averageQualities}
            onChange={(event) => onChange({ averageQualities: event.target.checked })}
            type="checkbox"
          />
          Show Averages
        </label>
      </div>

      {status === 'loading' && <div className="card-message">Loading live market history...</div>}
      {status === 'error' && <div className="card-message error">{error}</div>}
      {status === 'empty' && <div className="card-message">No market history is available for this item in this region.</div>}
      {status === 'ready' && (
        <Suspense fallback={<div className="card-message">Preparing chart...</div>}>
          <PriceChart
            history={chartHistory}
            locations={availableLocations}
            locationsWithData={availableChartHistory.map((entry) => entry.location)}
            metric={card.metric}
            recommendedLocation={recommendedLocation}
            onToggleLocation={toggleLocation}
            selectedLocations={selectedLocations}
          />
        </Suspense>
      )}
        </>
      )}
    </article>
  );
}
