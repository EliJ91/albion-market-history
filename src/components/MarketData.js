import React, { useState, useEffect, useRef } from 'react';
import './MarketData.css';
import { searchItems } from '../utils/itemParser';
import AlbionMarketService from '../services/AlbionMarketService';
import { getHistoryApiUrl, AlbionAPI, QUALITIES, CITIES } from '../services/AlbionAPI';
import itemDatabase from '../data/itemDatabase.json';
import PriceChart from './PriceChart';

const MarketData = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedEnchantment, setSelectedEnchantment] = useState('All');
  const [selectedQuality, setSelectedQuality] = useState('All'); // 'All' or number
  // Add state for selected cities
  const [selectedCities, setSelectedCities] = useState([]);
  // Add state for selected time range
  const [selectedTimeRange, setSelectedTimeRange] = useState('1w'); // default 1 week

  // Filter options
  const tierOptions = ['All', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
  const enchantmentOptions = ['All', '0', '1', '2', '3', '4'];
  // Use numeric values for quality options
  const qualityOptions = [
    { label: 'All', value: 'All' },
    { label: 'Normal', value: 1 },
    { label: 'Good', value: 2 },
    { label: 'Outstanding', value: 3 },
    { label: 'Excellent', value: 4 },
    { label: 'Masterpiece', value: 5 }
  ];

  // Search for item key in itemDatabase
  const [dbResult, setDbResult] = useState(null);

  // Suggestions for itemDatabase keys
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchInputRef = useRef(null);

  // Add state for selected quality per location
  const [locationQualities, setLocationQualities] = useState({});

  // Helper to normalize strings (remove punctuation, lower case)
  function normalize(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  // Modified handleDbSearch for normalization
  const handleDbSearch = (term) => {
    if (!term) {
      setDbResult(null);
      setSuggestions([]);
      return;
    }
    const normTerm = normalize(term);
    const matches = Object.keys(itemDatabase).filter(key => normalize(key).includes(normTerm));
    setSuggestions(matches.slice(0, 10));
    const exact = matches.find(key => normalize(key) === normTerm);
    if (exact) {
      setDbResult({ key: exact, value: itemDatabase[exact] });
    } else {
      setDbResult(null);
    }
  };

  // Helper to get ISO date string for N days ago
  function getDateNDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  // Map time range to time-scale and date range
  const TIME_RANGE_OPTIONS = [
    { label: '1 Day', value: '1d', timeScale: 1, days: 1 },
    { label: '1 Week', value: '1w', timeScale: 1, days: 7 },
    { label: '1 Month', value: '1m', timeScale: 24, days: 30 },
    { label: '3 Months', value: '3m', timeScale: 24, days: 90 },
  ];
  const selectedTimeOption = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedTimeRange) || TIME_RANGE_OPTIONS[1];

  // Unified function to trigger API fetch
  const triggerApiFetch = async () => {
    if (dbResult && dbResult.value) {
      let itemId = dbResult.value;
      if (!selectedEnchantment || selectedEnchantment === 'All' || selectedEnchantment === '0') {
        itemId = dbResult.value.split('@')[0];
      }
      // Calculate date_from and date_to
      const date_to = new Date();
      const date_from = getDateNDaysAgo(selectedTimeOption.days);
      const dateToStr = date_to.toISOString().split('T')[0];
      // Use correct time-scale
      const timeScale = selectedTimeOption.timeScale;
      // Construct URL with date_from and date_to
      const url = `${getHistoryApiUrl(itemId, { timeScale })}&date_from=${date_from}&date_to=${dateToStr}`;
      console.log('Constructed API URL:', url);
      setLoading(true);
      try {
        // Use custom fetch to include date_from and date_to
        const response = await fetch(url);
        const data = await response.json();
        setMarketData({ success: true, data });
      } catch (error) {
        setMarketData({ success: false, error: error.message });
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Enter key and arrow navigation in search
  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        setActiveSuggestion((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestion]);
          triggerApiFetch();
        } else {
          // Try to match input directly
          const normTerm = normalize(searchTerm);
          const match = Object.keys(itemDatabase).find(key => normalize(key) === normTerm);
          if (match) {
            handleSuggestionClick(match);
            triggerApiFetch();
          }
        }
      }
    } else if (e.key === 'Enter') {
      // Try to match input directly
      const normTerm = normalize(searchTerm);
      const match = Object.keys(itemDatabase).find(key => normalize(key) === normTerm);
      if (match) {
        handleSuggestionClick(match);
        triggerApiFetch();
      }
    }
  };

  // When user selects a suggestion (item)
  const handleSuggestionClick = (key) => {
    setSearchTerm(key);
    setSuggestions([]);
    setActiveSuggestion(-1);
    const value = itemDatabase[key];
    setDbResult({ key, value });
    // Parse value for tier and enchantment
    const { tier, enchant } = parseItemValue(value);
    setSelectedTier(tier);
    setSelectedEnchantment(enchant);
    // API fetch on suggestion select
    setTimeout(triggerApiFetch, 0);
  };

  const handleSearch = async (term) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await searchItems(term);
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setSearchResults([]);
    setSearchTerm(item.LocalizedNames?.['EN-US'] || item.UniqueName);
    setLoading(true);

    try {
      const priceData = await AlbionMarketService.getItemPrices(item.UniqueName);
      setMarketData(priceData);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setMarketData({ success: false, error: 'Failed to fetch market data' });
    } finally {
      setLoading(false);
    }
  };

  // Tier to preface mapping
  const TIER_PREFACE = {
    T4: "Adept's",
    T5: "Expert's",
    T6: "Master's",
    T7: "Grandmaster's",
    T8: "Elder's",
    T3: "Journeyman's",
    T2: "Novice's",
    T1: "Beginner's"
  };

  // Preface to tier mapping
  const PREFACE_TIER = Object.fromEntries(Object.entries(TIER_PREFACE).map(([tier, preface]) => [preface, tier]));

  // Helper to get preface from item name
  function getPreface(itemName) {
    const found = Object.values(TIER_PREFACE).find(pref => itemName.startsWith(pref));
    return found || null;
  }

  // Helper to get base name (without preface)
  function getBaseName(itemName) {
    const preface = getPreface(itemName);
    if (preface) return itemName.replace(preface + ' ', '');
    return itemName;
  }

  // Helper to get item name for tier
  function getItemNameForTier(baseName, tier) {
    const preface = TIER_PREFACE[tier];
    return preface ? `${preface} ${baseName}` : baseName;
  }

  // Helper to parse value (e.g. T4_MAIN_SWORD@4)
  function parseItemValue(val) {
    const [main, enchant] = val.split('@');
    const tier = main.split('_')[0];
    return { tier, enchant: enchant || '0' };
  }

  // Helper to get available qualities for a location's data
  function getQualitiesForLocation(dataArr) {
    const unique = Array.from(new Set(dataArr.map(d => d.quality)));
    return unique.map(q => ({ value: q, label: QUALITIES[q] || `Quality ${q}` }));
  }

  // Helper to group API data by location and filter by quality
  function groupDataByLocationAndQuality(apiData, quality) {
    const grouped = {};
    apiData.forEach(entry => {
      if (quality === 'All' || String(entry.quality) === String(quality)) {
        if (!grouped[entry.location]) grouped[entry.location] = [];
        grouped[entry.location].push(...entry.data);
      }
    });
    return grouped;
  }

  // When user changes tier or enchantment, update item selection if possible and fetch API
  useEffect(() => {
    if (!dbResult) return;
    const baseName = getBaseName(dbResult.key);
    const newItemName = getItemNameForTier(baseName, selectedTier);
    // Find the new key in itemDatabase
    const match = Object.keys(itemDatabase).find(
      k => k === newItemName
    );
    if (match) {
      setSearchTerm(match);
      setDbResult({ key: match, value: itemDatabase[match] });
    }
    // If enchantment changed, update value
    // (value is like T4_MAIN_SWORD@4, so replace @N)
    if (dbResult.value) {
      const baseVal = dbResult.value.split('@')[0];
      const newVal = selectedEnchantment !== '0' ? `${baseVal}@${selectedEnchantment}` : baseVal;
      setDbResult(prev => prev ? { ...prev, value: newVal } : prev);
    }
    // API fetch on dropdown change
    setTimeout(triggerApiFetch, 0);
  }, [selectedTier, selectedEnchantment]);

  // Helper to get numeric quality value from label
  function getQualityValue(label) {
    if (label === 'All') return null;
    const idx = QUALITIES.indexOf(label);
    return idx > 0 ? idx : 1;
  }

  // Add these before the return statement
  const allCities = Object.keys(CITIES);
  const allQualities = marketData && marketData.data ? Array.from(new Set(marketData.data.map(entry => entry.quality))).sort((a,b)=>a-b) : [];

  // Helper: get cities with data for selected quality
  function getCitiesWithData() {
    if (!marketData || !marketData.data) return [];
    if (selectedQuality === 'All') {
      return Array.from(new Set(marketData.data.map(entry => entry.location)));
    }
    return Array.from(new Set(marketData.data.filter(entry => String(entry.quality) === String(selectedQuality)).map(entry => entry.location)));
  }
  const citiesWithData = getCitiesWithData();

  // Handle city checkbox change
  const handleCityChange = (city) => {
    setSelectedCities((prev) =>
      prev.includes(city)
        ? prev.filter((c) => c !== city)
        : [...prev, city]
    );
  };

  // On first data load, select all cities with data by default
  useEffect(() => {
    if (marketData && marketData.data && selectedCities.length === 0) {
      setSelectedCities(getCitiesWithData());
    }
    // eslint-disable-next-line
  }, [marketData]);

  return (
    <div className="market-data">
      <div className="header-section">
        <div className="filters-section">
          <div className="search-section">
            <label className="input-label" htmlFor="item-search">Item Name</label>
            <input
              id="item-search"
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
                handleDbSearch(e.target.value);
                setActiveSuggestion(-1);
              }}
              onKeyDown={handleKeyDown}
              className="search-input"
              ref={searchInputRef}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleItemSelect(item)}
                  >
                    {item.LocalizedNames?.['EN-US'] || item.UniqueName}
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions dropdown for itemDatabase */}
            {suggestions.length > 0 && (
              <div className="search-results">
                {suggestions.map((key, idx) => (
                  <div
                    key={key}
                    className={`search-result-item${activeSuggestion === idx ? ' active' : ''}`}
                    onClick={() => { handleSuggestionClick(key); triggerApiFetch(); }}
                  >
                    {key}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="dropdown-filters">
            <div className="dropdown-group">
              <label className="input-label" htmlFor="tier-select">Tier</label>
              <select 
                id="tier-select"
                value={selectedTier} 
                onChange={(e) => setSelectedTier(e.target.value)}
                className="filter-dropdown"
              >
                {tierOptions.map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
            <div className="dropdown-group">
              <label className="input-label" htmlFor="enchant-select">Enchantment</label>
              <select 
                id="enchant-select"
                value={selectedEnchantment} 
                onChange={(e) => setSelectedEnchantment(e.target.value)}
                className="filter-dropdown"
              >
                {enchantmentOptions.map(ench => (
                  <option key={ench} value={ench}>
                    {ench === 'All' ? 'All Enchantments' : `+${ench}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="dropdown-group">
              <label className="input-label" htmlFor="time-range-select">Time Range</label>
              <select 
                id="time-range-select"
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="filter-dropdown"
              >
                {TIME_RANGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="filter-dropdown search-btn"
              onClick={triggerApiFetch}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading">Loading market data...</div>
      )}

      {marketData && !loading && (
        <div className="market-results">
          {marketData.success ? (
            <div className="market-data-display">
              <h3>Market Data for {selectedItem?.LocalizedNames?.['EN-US'] || selectedItem?.UniqueName || dbResult?.key}</h3>
              <PriceChart
                allData={marketData.data}
                allCities={allCities}
                allQualities={allQualities}
                QUALITIES={QUALITIES}
                selectedCities={selectedCities}
                setSelectedCities={setSelectedCities}
                selectedTimeRange={selectedTimeRange}
                setSelectedTimeRange={setSelectedTimeRange}
              />
            </div>
          ) : (
            <div className="error">
              Error: {marketData.error || 'Failed to fetch market data'}
            </div>
          )}
        </div>
      )}

      {/* Show itemDatabase result if found */}
      {dbResult && (
        <div className="db-result">
          <strong>Key:</strong> {dbResult.key} <br />
          <strong>Value:</strong> {dbResult.value}
        </div>
      )}
    </div>
  );
};

export default MarketData;
