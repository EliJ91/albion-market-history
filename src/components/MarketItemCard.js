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

const MarketItemCard = ({ item, marketData, cityColors, selectedCities = [], onCityToggle, onToggleOpen }) => {
  const safeSelectedCities = Array.isArray(selectedCities) ? selectedCities : [];
  const [selectedQuality, setSelectedQuality] = useState(1);
  const cityDropdownRef = useRef(null);
  const cityButtonRef = useRef(null);

  // Extract enchantment from item.value (after @, or 0 if not present)
  const enchantment = (() => {
    if (!item.value) return 0;
    const parts = item.value.split('@');
    return parts.length > 1 ? Number(parts[1]) : 0;
  })();

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

  return (
    <div className="market-item-card">
      <div className="market-item-header-row">
        <h3 className="market-item-title">
          {item?.LocalizedNames?.['EN-US'] || item?.UniqueName || item?.key}
          {enchantment > 0 && (
            <span className={`enchant-label enchant-${enchantment}`}>{`. ${enchantment}`}</span>
          )}
        </h3>
        <div className="market-item-controls-row">
          <div className="market-item-quality-selector">
            <label className="input-label" htmlFor="quality-select">Quality:</label>
            <select
              id="quality-select"
              value={selectedQuality}
              onChange={e => setSelectedQuality(Number(e.target.value))}
              className="filter-dropdown"
            >
              <option value={1}>Normal</option>
              <option value={2}>Good</option>
              <option value={3}>Outstanding</option>
              <option value={4}>Excellent</option>
              <option value={5}>Masterpiece</option>
            </select>
          </div>
          <div className="market-item-city-selector">
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
                Cities
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
          <button className="close-btn" onClick={onToggleOpen} title="Remove card">×</button>
        </div>
      </div>
      <div className="market-item-main-col">
        <PriceChart
          allData={marketData}
          selectedTimeRange={'4w'}
          selectedQuality={selectedQuality}
          onQualityChange={setSelectedQuality}
          item={item}
          selectedCities={safeSelectedCities}
          cityColors={cityColors}
        />
      </div>
    </div>
  );
};

export default MarketItemCard;
