import React, { useState, useEffect, useRef } from 'react';
import './MarketData.css';
import { searchItems } from '../utils/itemParser';
import AlbionMarketService from '../services/AlbionMarketService';
import { getHistoryApiUrl, AlbionAPI, QUALITIES, CITIES } from '../services/AlbionAPI';
import itemDatabase from '../data/itemDatabase.json';
import PriceChart from './PriceChart';
import MarketItemCard from './MarketItemCard';

const MarketData = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [openCards, setOpenCards] = useState([]); // [{ item, marketData, loading }]
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedTier, setSelectedTier] = useState('Select');
  const [selectedEnchantment, setSelectedEnchantment] = useState('Select');
  const [selectedQuality, setSelectedQuality] = useState('All'); // 'All' or number
  // Add state for selected cities
  const [selectedCities, setSelectedCities] = useState([]);
  // Add state for selected time range
  const [selectedTimeRange, setSelectedTimeRange] = useState('1w'); // default 1 week

  // Filter options
  const tierOptions = ['Select', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
  const enchantmentOptions = ['Select', '0', '1', '2', '3', '4'];
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

  // Helper to get base weapon name (strip tier/preface and enchant)
  function getBaseWeaponName(itemName) {
    // Remove tier preface (e.g., "Adept's ", "Expert's ", etc.)
    const prefaces = [
      "Beginner's", "Novice's", "Journeyman's", "Adept's", "Expert's", "Master's", "Grandmaster's", "Elder's"
    ];
    let base = itemName;
    for (const preface of prefaces) {
      if (base.startsWith(preface + ' ')) {
        base = base.slice(preface.length + 1);
        break;
      }
    }
    // Remove enchantment suffix (e.g., "@1", "@2") if present
    base = base.replace(/@\d+$/, '');
    return base.trim();
  }

  // Modified handleDbSearch for normalization and unique base weapon names
  const handleDbSearch = (term) => {
    if (!term) {
      setDbResult(null);
      setSuggestions([]);
      return;
    }
    const normTerm = normalize(term);
    const seen = new Set();
    const matches = [];
    for (const key of Object.keys(itemDatabase)) {
      if (normalize(key).includes(normTerm)) {
        const base = getBaseWeaponName(key);
        if (!seen.has(base.toLowerCase())) {
          seen.add(base.toLowerCase());
          matches.push({ key, base });
        }
      }
    }
    setSuggestions(matches.slice(0, 10));
    const exact = matches.find(obj => normalize(obj.key) === normTerm);
    if (exact) {
      setDbResult({ key: exact.key, value: itemDatabase[exact.key] });
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
    { label: '1 Week', value: '1w', timeScale: 24, days: 7 },
    { label: '2 Weeks', value: '2w', timeScale: 24, days: 14 },
    { label: '4 Weeks', value: '4w', timeScale: 24, days: 28 },
  ];
  const selectedTimeOption = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedTimeRange) || TIME_RANGE_OPTIONS[2];

  // Unified function to trigger API fetch
  // Store market data for the currently selected item (for filters, etc.)
  const [marketData, setMarketData] = useState(null);

  const triggerApiFetch = async () => {
    if (dbResult && dbResult.value) {
      let itemId = dbResult.value;
      // Always remove @N for initial fetch (predictive text selection)
      itemId = itemId.split('@')[0];
      // Calculate date_from and date_to (now pulls 4 weeks/28 days)
      const date_to = new Date();
      const date_from = getDateNDaysAgo(28); // Always fetch 4 weeks (28 days)
      const dateToStr = date_to.toISOString().split('T')[0];
      const timeScale = 24;
      const url = `${getHistoryApiUrl(itemId, { timeScale })}&date_from=${date_from}&date_to=${dateToStr}`;
      setLoading(true);
      try {
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
  const handleSuggestionClick = async (key) => {
    setSearchTerm(key);
    setSuggestions([]);
    setActiveSuggestion(-1);
    const value = itemDatabase[key];
    setDbResult({ key, value });
    // Parse value for tier and enchantment
    const { tier, enchant } = parseItemValue(value);
    setSelectedTier('Select');
    setSelectedEnchantment('Select');
    // Fetch API for this item and add a new card (always use value minus @N)
    setLoading(true);
    try {
      let itemId = value.split('@')[0];
      const date_to = new Date();
      const date_from = getDateNDaysAgo(90);
      const dateToStr = date_to.toISOString().split('T')[0];
      const timeScale = 24;
      const url = `${getHistoryApiUrl(itemId, { timeScale })}&date_from=${date_from}&date_to=${dateToStr}`;
      const response = await fetch(url);
      const data = await response.json();
      setOpenCards(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          item: { key, value, LocalizedNames: itemDatabase[key]?.LocalizedNames, UniqueName: key },
          marketData: data,
        }
      ]);
      setMarketData({ success: true, data });
    } catch (error) {
      // Optionally handle error
      setMarketData({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
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

  // Removed setSelectedItem (not used/defined)
  const handleItemSelect = async (item) => {
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
                {suggestions.map((obj, idx) => (
                  <div
                    key={obj.key}
                    className={`search-result-item${activeSuggestion === idx ? ' active' : ''}`}
                    onClick={() => { handleSuggestionClick(obj.key); triggerApiFetch(); }}
                  >
                    {obj.base}
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
                  <option key={tier} value={tier} disabled={tier === 'Select'}>{tier === 'Select' ? 'Select Tier' : tier}</option>
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
                  <option key={ench} value={ench} disabled={ench === 'Select'}>
                    {ench === 'Select' ? 'Select Enchantment' : `+${ench}`}
                  </option>
                ))}
              </select>
            </div>
            {/* Time Range dropdown removed from search area */}
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

      {/* Render all open item cards */}
      <div className="market-results" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {openCards.map(card => (
          <MarketItemCard
            key={card.id}
            item={card.item}
            marketData={card.marketData}
            allCities={allCities}
            onClose={() => setOpenCards(prev => prev.filter(c => c.id !== card.id))}
          />
        ))}
      </div>

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
