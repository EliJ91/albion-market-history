import React, { useState, useRef, useEffect } from 'react';
import PriceChart from './PriceChart';
import './MarketItemCard.css';

const CITY_COLORS = {
  Caerleon: '#D7263D', // Red
  Bridgewatch: '#FFD166', // Sand Yellow
  Lymhurst: '#228B22', // Forest Green
  Martlock: '#1E90FF', // Ocean Blue
  Thetford: '#8F43B7', // Violet purple
  'Fort Sterling': '#F8F8FF', // White (use a slightly off-white for visibility)
  'Black Market': '#222222', // Black
};

const MarketItemCard = ({
  item,
  marketData,
  cityColors,
  selectedCities = [],
  selectedQuality = 1,
  onQualityChange,
  chartValue = 'avg_price',
  onChartValueChange,
  onCityToggle,
  onToggleOpen
}) => {
  // Get a unique key for this item card
  const itemKey = item?.UniqueName || item?.value || item?.key || 'unknown';
  const useAvgStorageKey = `marketItemCard_useAvg_${itemKey}`;

  // Initialize useAvg from localStorage on first render, per item
  const [useAvg, setUseAvg] = useState(() => {
    try {
      const saved = window.localStorage.getItem(useAvgStorageKey);
      return saved === null ? false : saved === 'true';
    } catch {
      return false;
    }
  });
  const safeSelectedCities = Array.isArray(selectedCities) ? selectedCities : [];
  const cityDropdownRef = useRef(null);
  const cityButtonRef = useRef(null);

  // Extract enchantment from item.value (after @, or 0 if not present)
  const enchantment = (() => {
    if (!item.value) return 0;
    const parts = item.value.split('@');
    return parts.length > 1 ? Number(parts[1]) : 0;
  })();

  // Combine all qualities for each city and timestamp if useAvg is true
  function getCombinedMarketData() {
    if (!useAvg || !marketData) return marketData;
    // Group by city, then by timestamp (date only)
    const grouped = {};
    for (const entry of marketData) {
      const city = entry.location;
      if (!grouped[city]) grouped[city] = {};
      for (const point of entry.data) {
        // Use only the date part for grouping (YYYY-MM-DD)
        const date = new Date(point.timestamp);
        const dateKey = date.toISOString().slice(0, 10);
        if (!grouped[city][dateKey]) grouped[city][dateKey] = { sumPrice: 0, sumQty: 0, count: 0 };
        grouped[city][dateKey].sumPrice += point.avg_price;
        grouped[city][dateKey].sumQty += point.item_count;
        grouped[city][dateKey].count += 1;
      }
    }
    // Convert back to array format expected by PriceChart, sorted by date
    return Object.entries(grouped).map(([city, tsMap]) => {
      const sortedData = Object.entries(tsMap)
        .map(([date, { sumPrice, sumQty, count }]) => ({
          timestamp: date, // Use date string as timestamp
          avg_price: count > 0 ? Math.ceil(sumPrice / count) : 0, // Round up to nearest whole number
          item_count: sumQty
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        location: city,
        quality: 0,
        data: sortedData
      };
    });
  }
  const processedMarketData = getCombinedMarketData();

  // Determine which cities have data for the selected quality
  const citiesWithData = new Set(
    (marketData || [])
      .filter(entry => entry.quality === selectedQuality && entry.data && entry.data.length > 0)
      .map(entry => entry.location)
  );


  // Remove cities with no data from selection if present
  useEffect(() => {
    const filtered = safeSelectedCities.filter(city => citiesWithData.has(city));
    if (filtered.length !== safeSelectedCities.length) {
      onCityToggle(filtered);
    }
    // eslint-disable-next-line
  }, [selectedQuality, marketData]);

  // Reset cities to all when quality changes
  useEffect(() => {
    const allEnabledCities = Object.keys(cityColors).filter(city => {
      return (marketData || []).some(entry => entry.location === city && entry.quality === selectedQuality && entry.data && entry.data.length > 0);
    });
    onCityToggle(allEnabledCities);
    // eslint-disable-next-line
  }, [selectedQuality]);

  // Collapse city dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target) &&
        cityButtonRef.current &&
        !cityButtonRef.current.contains(event.target)
      ) {
        cityDropdownRef.current.classList.remove('dropdown-list-open');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist useAvg to localStorage when it changes, per item
  useEffect(() => {
    try {
      if (typeof useAvg === 'boolean') {
        window.localStorage.setItem(useAvgStorageKey, useAvg ? 'true' : 'false');
        // console.log('[MarketItemCard] Saved useAvg to localStorage:', useAvgStorageKey, useAvg);
      }
    } catch (e) {
      // console.error('[MarketItemCard] Error saving useAvg to localStorage:', e);
    }
  }, [useAvg, useAvgStorageKey]);

  // Map for tier prefix to Roman numeral
  const TIER_ROMAN = {
    "Beginner's": 'Ⅰ',
    "Novice's": 'Ⅱ',
    "Journeyman's": 'Ⅲ',
    "Adept's": 'Ⅳ',
    "Expert's": 'Ⅴ',
    "Master's": 'Ⅵ',
    "Grandmaster's": 'Ⅶ',
    "Elder's": 'Ⅷ',
  };

  // Helper to get Roman numeral prefix for item name
  function getRomanPrefix(name) {
    if (!name) return '';
    const match = name.match(/^(Beginner's|Novice's|Journeyman's|Adept's|Expert's|Master's|Grandmaster's|Elder's)/);
    if (match) return TIER_ROMAN[match[1]] + ' ';
    return '';
  }

  return (
    <div className="market-item-card">
      {/* Item name row */}
      <div className="market-item-title-row">
        <h3 className="market-item-title">
          <span className="roman-tier-prefix">{getRomanPrefix(item?.LocalizedNames?.['EN-US'] || item?.UniqueName || item?.key)}</span>
          {item?.LocalizedNames?.['EN-US'] || item?.UniqueName || item?.key}
          {enchantment > 0 && (
            <span className={`enchant-label enchant-${enchantment}`}>{`. ${enchantment}`}</span>
          )}
        </h3>
        <button className="close-btn" onClick={onToggleOpen} title="Remove card">×</button>
      </div>
      {/* Controls row */}
      <div className="market-item-controls-flex-row">
        <div className="market-item-control-group">
          <label className="input-label" htmlFor="quality-select">Quality:</label>
          <select
            id="quality-select"
            value={selectedQuality}
            onChange={e => onQualityChange(Number(e.target.value))}
            className="filter-dropdown"
            disabled={useAvg} // Disable when Use Avg is checked
            style={useAvg ? { background: '#333', color: '#888', cursor: 'not-allowed' } : {}}
          >
            <option value={1}>Normal</option>
            <option value={2}>Good</option>
            <option value={3}>Outstanding</option>
            <option value={4}>Excellent</option>
            <option value={5}>Masterpiece</option>
          </select>
        </div>
        <div className="market-item-control-group">
          <label className="input-label" htmlFor="city-select">Cities:</label>
          <div className="dropdown-multicheckbox">
            <button
              type="button"
              className="filter-dropdown city-dropdown-btn"
              ref={cityButtonRef}
              onClick={e => {
                const dropdown = cityDropdownRef.current;
                dropdown.classList.toggle('dropdown-list-open');
              }}
            >
              Select Cities
            </button>
            <div className="dropdown-list" ref={cityDropdownRef}>
              {Object.keys(cityColors).map(city => {
                const hasData = citiesWithData.has(city);
                // Map city name to CSS class
                const cityClass =
                  city === 'Caerleon' ? 'city-caerleon' :
                  city === 'Bridgewatch' ? 'city-bridgewatch' :
                  city === 'Lymhurst' ? 'city-lymhurst' :
                  city === 'Martlock' ? 'city-martlock' :
                  city === 'Thetford' ? 'city-thetford' :
                  city === 'Fort Sterling' ? 'city-fortsterling' :
                  city === 'Black Market' ? 'city-blackmarket' :
                  '';
                const disabledClass = hasData ? '' : 'city-disabled';
                return (
                  <label key={city} className={`city-checkbox-item`}>
                    <input
                      type="checkbox"
                      checked={safeSelectedCities.includes(city) && hasData}
                      disabled={!hasData}
                      onChange={e => {
                        if (!hasData) return;
                        let newSelection;
                        if (e.target.checked) {
                          newSelection = [...safeSelectedCities, city].filter((v, i, a) => a.indexOf(v) === i);
                        } else {
                          newSelection = safeSelectedCities.filter(c => c !== city);
                        }
                        if (newSelection.length === 0) {
                          newSelection = Object.keys(cityColors).filter(c => citiesWithData.has(c));
                        }
                        onCityToggle(newSelection);
                      }}
                      className={`city-legend-checkbox ${cityClass} ${disabledClass}`}
                    />
                    <span className={`city-legend-label ${cityClass} ${disabledClass}`} style={{ fontWeight: 600 }}>{city}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="market-item-control-group">
          <label className="input-label" htmlFor="chart-value-toggle">Display:</label>
          <div className="button-toggle-group">
            <button
              type="button"
              className={chartValue === 'avg_price' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => onChartValueChange('avg_price')}
            >
              $
            </button>
            <button
              type="button"
              className={chartValue === 'quantity' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => onChartValueChange('quantity')}
            >
              #
            </button>
          </div>
        </div>
        <div className="market-item-control-group">
          <label className="input-label" htmlFor="use-avg-checkbox">Use Avg:</label>
          <input
            id="use-avg-checkbox"
            type="checkbox"
            checked={useAvg}
            onChange={e => setUseAvg(e.target.checked)}
          />
        </div>
      </div>
      <div className="market-item-main-col">
        <PriceChart
          allData={processedMarketData}
          selectedTimeRange={'4w'}
          selectedQuality={selectedQuality}
          onQualityChange={onQualityChange}
          item={item}
          selectedCities={safeSelectedCities}
          cityColors={cityColors}
          chartValue={chartValue}
        />
      </div>
    </div>
  );
};

export default MarketItemCard;
