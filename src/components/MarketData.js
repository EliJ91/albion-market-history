import React, { useState, useEffect, useRef } from 'react';
import './MarketData.css';
import { searchItems } from '../utils/itemParser';
import AlbionMarketService from '../services/AlbionMarketService';
import { getHistoryApiUrl, AlbionAPI, QUALITIES, CITIES } from '../services/AlbionAPI';
import itemDatabase from '../data/itemDatabase.json';
import PriceChart from './PriceChart';
import MarketItemCard from './MarketItemCard';

// Helper to generate a color palette for cities
const CITY_COLOR_PALETTE = [
  '#4fd1c5', '#f56565', '#f6e05e', '#63b3ed', '#ed64a6', '#68d391', '#a0aec0', '#f6ad55', '#9f7aea', '#38b2ac', '#e53e3e', '#ecc94b', '#3182ce', '#d53f8c', '#38a169', '#718096', '#dd6b20', '#6b46c1', '#319795', '#c53030', '#b7791f', '#2b6cb0', '#97266d', '#276749', '#4a5568', '#b83280', '#22543d', '#2c5282', '#553c9a', '#234e52', '#1a202c'
];
function getCityColors(cityList) {
  const colors = {};
  cityList.forEach((city, i) => {
    colors[city] = CITY_COLOR_PALETTE[i % CITY_COLOR_PALETTE.length];
  });
  return colors;
}

const MarketData = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // [{ id, item, marketData, selectedQuality, chartValue }]
  const [openCards, setOpenCards] = useState(() => {
    try {
      const saved = localStorage.getItem('openCards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedTier, setSelectedTier] = useState('Select');
  const [selectedEnchantment, setSelectedEnchantment] = useState('Select');
  const [selectedQuality, setSelectedQuality] = useState('All'); // 'All' or number

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
  const suggestionsRef = useRef(null);

  // Add state for selected quality per location
  const [locationQualities, setLocationQualities] = useState({});

  // Resource types that use _LEVELN@N for enchantment
  const RESOURCE_TYPES = [
    'PLANKS', 'WOOD', 'METALBAR', 'ORE', 'ROCK', 'LEATHER', 'HIDE', 'CLOTH', 'FIBER'
  ];
  function isResource(val) {
    return RESOURCE_TYPES.some(type => val.includes(type));
  }
  function buildItemValue(baseVal, enchant) {
    if (isResource(baseVal)) {
      if (enchant && enchant !== '0' && enchant !== 'Select') {
        // Remove _LEVELN and @N if present
        const noLevel = baseVal.replace(/_LEVEL\d+(@\d+)?$/, '');
        return `${noLevel}_LEVEL${enchant}@${enchant}`;
      } else {
        // Unenchanted resource
        return baseVal.replace(/_LEVEL\d+(@\d+)?$/, '');
      }
    } else {
      // Gear and other items
      if (enchant && enchant !== '0' && enchant !== 'Select') {
        return `${baseVal.split('@')[0]}@${enchant}`;
      } else {
        return baseVal.split('@')[0];
      }
    }
  }

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
  // Remove selectedTimeRange from this file
  // const selectedTimeOption = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedTimeRange) || TIME_RANGE_OPTIONS[2];

  // Unified function to trigger API fetch
  // Store market data for the currently selected item (for filters, etc.)
  const [marketData, setMarketData] = useState(null);

  const triggerApiFetch = async () => {
    if (dbResult && dbResult.value) {
      let tier = selectedTier !== 'Select' ? selectedTier : parseItemValue(dbResult.value).tier;
      let enchant = selectedEnchantment !== 'Select' ? selectedEnchantment : parseItemValue(dbResult.value).enchant;
      let baseVal = dbResult.value.split('@')[0];
      let itemId = buildItemValue(baseVal, enchant);
      // Always use default time range for API fetch
      const date_to = new Date();
      const date_from = getDateNDaysAgo(7);
      const dateToStr = date_to.toISOString().split('T')[0];
      const url = `${getHistoryApiUrl(itemId, { timeScale: 24 })}&date_from=${date_from}&date_to=${dateToStr}`;
      setLoading(true);
      try {
        const response = await fetch(url);
        const data = await response.json();
        setMarketData({ success: true, data });
        setOpenCards(prev => {
          // Remove any card with the same itemId
          const filtered = prev.filter(card => card.item.value !== itemId);
          return [
            {
              id: Date.now() + Math.random(),
              item: { key: dbResult.key, value: itemId, LocalizedNames: itemDatabase[dbResult.key]?.LocalizedNames, UniqueName: dbResult.key },
              marketData: data,
              selectedQuality: 1,
              chartValue: 'avg_price',
            },
            ...filtered
          ];
        });
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

  // Helper to parse value (e.g. T4_MAIN_SWORD@4)
  function parseItemValue(val) {
    const [main, enchant] = val.split('@');
    const tier = main.split('_')[0];
    return { tier, enchant: enchant || '0' };
  }

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
    // Try Tn_SOMETHING format first
    const tKey = `${tier}_${baseName.replace(/ /g, '_')}`;
    if (itemDatabase[tKey]) return tKey;
    // Otherwise, use preface format
    const preface = TIER_PREFACE[tier];
    return preface ? `${preface} ${baseName}` : baseName;
  }

  // --- SUGGESTION HANDLING ---
  function normalize(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  const handleDbSearch = (term) => {
    if (!term) {
      setDbResult(null);
      setSuggestions([]);
      return;
    }
    const normTerm = normalize(term);
    const forbidden = ["Beginner's", "Novice's", "Journeyman's", "Adept's", "Expert's", "Master's", "Grandmaster's", "Elder's"];
    let foundDisplay = new Set();
    let suggestions = [];
    for (const key of Object.keys(itemDatabase)) {
      if (normalize(key).includes(normTerm)) {
        let display = key;
        for (const word of forbidden) {
          if (display.startsWith(word + ' ')) {
            display = display.slice(word.length + 1);
            break;
          }
        }
        if (!foundDisplay.has(display)) {
          suggestions.push({ key, display });
          foundDisplay.add(display);
        }
        if (suggestions.length >= 1) break;
      }
    }
    setSuggestions(suggestions);
    // Do not setDbResult here; only set on click/enter
  };

  // --- DROPDOWN CHANGE HANDLING ---
  useEffect(() => {
    if (!dbResult) return;
    let tier = selectedTier !== 'Select' ? selectedTier : parseItemValue(dbResult.value).tier;
    let enchant = selectedEnchantment !== 'Select' ? selectedEnchantment : parseItemValue(dbResult.value).enchant;
    const baseName = getBaseName(dbResult.key);
    const newItemName = getItemNameForTier(baseName, tier);
    const match = Object.keys(itemDatabase).find(k => k === newItemName);
    if (match) {
      const baseVal = itemDatabase[match].split('@')[0];
      const newVal = buildItemValue(baseVal, enchant);
      setSearchTerm(match);
      setDbResult({ key: match, value: newVal });
    } else if (dbResult.value) {
      const baseVal = dbResult.value.split('@')[0];
      const newVal = buildItemValue(baseVal, enchant);
      setDbResult(prev => prev ? { ...prev, value: newVal } : prev);
    }
    // Do NOT auto-fetch on dropdown change
  }, [selectedTier, selectedEnchantment]);

  // --- SUGGESTION CLICK HANDLING ---
  const handleSuggestionClick = async (suggestion) => {
    const key = typeof suggestion === 'string' ? suggestion : suggestion.key;
    setSearchTerm(key);
    setSuggestions([]);
    setActiveSuggestion(-1);
    const value = itemDatabase[key];
    setDbResult({ key, value });
    setSelectedTier('Select');
    setSelectedEnchantment('Select');
    setLoading(true);
    try {
      let baseVal = value.split('@')[0];
      let itemId = buildItemValue(baseVal, parseItemValue(value).enchant);
      const date_to = new Date();
      const date_from = getDateNDaysAgo(7);
      const dateToStr = date_to.toISOString().split('T')[0];
      const url = `${getHistoryApiUrl(itemId, { timeScale: 24 })}&date_from=${date_from}&date_to=${dateToStr}`;
      const response = await fetch(url);
      const data = await response.json();
      setOpenCards(prev => {
        // Remove any card with the same itemId
        const filtered = prev.filter(card => card.item.value !== itemId);
        return [
          ...filtered,
          {
            id: Date.now() + Math.random(),
            item: { key, value: itemId, LocalizedNames: itemDatabase[key]?.LocalizedNames, UniqueName: key },
            marketData: data,
            selectedQuality: 1,
            chartValue: 'avg_price',
          }
        ];
      });
  // Handler to change quality for a card
  const handleCardQualityChange = (cardId, newQuality) => {
    setOpenCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, selectedQuality: newQuality } : card
    ));
  };

  // Handler to change chart value for a card
  const handleCardChartValueChange = (cardId, newValue) => {
    setOpenCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, chartValue: newValue } : card
    ));
  };
      setMarketData({ success: true, data });
    } catch (error) {
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
    let tier = selectedTier !== 'Select' ? selectedTier : parseItemValue(dbResult.value).tier;
    let enchant = selectedEnchantment !== 'Select' ? selectedEnchantment : parseItemValue(dbResult.value).enchant;
    const baseName = getBaseName(dbResult.key);
    const newItemName = getItemNameForTier(baseName, tier);
    const match = Object.keys(itemDatabase).find(k => k === newItemName);
    if (match) {
      const baseVal = itemDatabase[match].split('@')[0];
      const newVal = buildItemValue(baseVal, enchant);
      setSearchTerm(match);
      setDbResult({ key: match, value: newVal });
    } else if (dbResult.value) {
      const baseVal = dbResult.value.split('@')[0];
      const newVal = buildItemValue(baseVal, enchant);
      setDbResult(prev => prev ? { ...prev, value: newVal } : prev);
    }
    // Do NOT auto-fetch on dropdown change
  }, [selectedTier, selectedEnchantment]);

  // Add city selection state per card
  const [cardCitySelections, setCardCitySelections] = useState(() => {
    try {
      const saved = localStorage.getItem('cardCitySelections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  // Persist openCards and cardCitySelections to localStorage on change
  useEffect(() => {
    localStorage.setItem('openCards', JSON.stringify(openCards));
  }, [openCards]);

  useEffect(() => {
    localStorage.setItem('cardCitySelections', JSON.stringify(cardCitySelections));
  }, [cardCitySelections]);

  // Helper to get all cities (always show all, even if no data)
  const allCities = Object.keys(CITIES);
  const cityColors = getCityColors(allCities);

  // Handler to toggle city selection for a card
  const handleCityToggle = (cardId, city) => {
    setCardCitySelections(prev => {
      const selected = prev[cardId] || allCities;
      return {
        ...prev,
        [cardId]: selected.includes(city)
          ? selected.filter(c => c !== city)
          : [...selected, city],
      };
    });
  };

  // Handler to set city selection for a card (for multi-select dropdown)
  const handleCityDropdownChange = (cardId, cities) => {
    setCardCitySelections(prev => ({
      ...prev,
      [cardId]: cities.length > 0 ? cities : allCities, // default to all if empty
    }));
  };

  return (
    <div className="market-data">
      <div className="search-row">
        <div className="search-bar-group">
          <label className="input-label" htmlFor="item-search">Item Name</label>
          <input
            id="item-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleDbSearch(e.target.value);
              setActiveSuggestion(-1);
            }}
            placeholder="Search for items..."
            ref={searchInputRef}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          {suggestions.length > 0 && (
            <div className="suggestions" ref={suggestionsRef}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.key}
                  className={`suggestion-item ${activeSuggestion === index ? 'active' : ''}`}
                  onClick={() => {
                    setSearchTerm(suggestion.key);
                    setSuggestions([]);
                    setActiveSuggestion(-1);
                    const value = itemDatabase[suggestion.key];
                    setDbResult({ key: suggestion.key, value });
                    setSelectedTier('Select');
                    setSelectedEnchantment('Select');
                  }}
                >
                  {suggestion.display || suggestion.key}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="filter-group">
          <label className="input-label">Tier:</label>
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="filter-dropdown">
            {tierOptions.map(tier => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="input-label">Enchantment:</label>
          <select value={selectedEnchantment} onChange={(e) => setSelectedEnchantment(e.target.value)} className="filter-dropdown">
            {enchantmentOptions.map(enchant => (
              <option key={enchant} value={enchant}>{enchant}</option>
            ))}
          </select>
        </div>
        <button onClick={triggerApiFetch} disabled={loading} className="filter-dropdown search-btn search-btn-right">
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      <div className="results-section">
        {openCards.map(card => {
          const selectedCities = cardCitySelections[card.id] || allCities;
          return (
            <MarketItemCard
              key={card.id}
              item={card.item}
              marketData={card.marketData}
              loading={loading}
              selectedCities={selectedCities}
              onCityToggle={cities => handleCityDropdownChange(card.id, cities)}
              cityColors={cityColors}
              selectedQuality={card.selectedQuality || 1}
              onQualityChange={q => handleCardQualityChange(card.id, q)}
              chartValue={card.chartValue || 'avg_price'}
              onChartValueChange={v => handleCardChartValueChange(card.id, v)}
              onToggleOpen={() => {
                setOpenCards(prev => prev.filter(c => c.id !== card.id));
              }}
            />
          );
        })}
      </div>
    </div>
  );

  // Handler to change quality for a card
  function handleCardQualityChange(cardId, newQuality) {
    setOpenCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, selectedQuality: newQuality } : card
    ));
  }

  // Handler to change chart value for a card
  function handleCardChartValueChange(cardId, newValue) {
    setOpenCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, chartValue: newValue } : card
    ));
  }
}

export default MarketData;
