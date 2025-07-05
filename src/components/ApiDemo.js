import React, { useState, useEffect, useRef } from 'react';
import { AlbionAPI, CITIES, QUALITIES, TIME_SCALES, TIERS, ENCHANTMENTS, ItemUtils } from '../services/AlbionAPI';
import PriceChart from './PriceChart';
import './ApiDemo.css';

const ApiDemo = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyData, setHistoryData] = useState(null); // For chart component
  const [chartTimeScale, setChartTimeScale] = useState(24); // Current time scale for chart
  const [selectedCities, setSelectedCities] = useState(['Caerleon', 'Bridgewatch']);
  const [selectedQuality, setSelectedQuality] = useState('1');
  const [timeScale, setTimeScale] = useState('24');
  const [loading, setLoading] = useState(false);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [databaseLoaded, setDatabaseLoaded] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Filter states
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedEnchant, setSelectedEnchant] = useState('all');
  const [selectedQualityFilter, setSelectedQualityFilter] = useState('all');
  
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load featured items on mount
  useEffect(() => {
    console.log('🚀 ApiDemo component mounted, initializing...');
    initializeApp();
  }, []);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initializeApp = async () => {
    try {
      setInitializationError(null);
      console.log('🔄 Initializing app and loading database...');
      
      // Force load the database first
      const dbResult = await AlbionAPI.loadItemsDatabase(true);
      console.log('📊 Database loaded:', dbResult.length, 'items');
      
      if (dbResult.length === 0) {
        throw new Error('No items loaded from database');
      }
      
      setDatabaseLoaded(true);
      
      // Then load featured items
      await loadFeaturedItems();
      
      console.log('✅ App initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setInitializationError(error.message);
      setDatabaseLoaded(false);
    }
  };

  const loadFeaturedItems = async () => {
    const result = await AlbionAPI.getFeaturedItems(10);
    if (result.success) {
      setFeaturedItems(result.data);
    }
  };

  const handleSearch = async (query, forceUpdate = false) => {
    console.log('handleSearch called with:', query);
    setSearchQuery(query);
    setSelectedIndex(-1); // Reset selection when typing
    
    // Show suggestions even for single character (more predictive)
    if (query.length >= 1) {
      console.log('Searching for:', query);
      
      // Build filters object
      const filters = {};
      if (selectedTier !== 'all') filters.tier = selectedTier;
      if (selectedEnchant !== 'all') filters.enchant = parseInt(selectedEnchant);
      
      const result = await AlbionAPI.searchItems(query, 20, filters); // More results for better predictions
      console.log('Search result:', result);
      if (result.success) {
        setSearchResults(result.data);
        setShowDropdown(result.data.length > 0);
        console.log('Set search results:', result.data);
      } else {
        console.error('Search failed:', result.error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // Handle filter changes and re-search
  const handleFilterChange = () => {
    if (searchQuery.length >= 1) {
      handleSearch(searchQuery, true);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) {
      // If no dropdown is open and there's a selected item, handle Enter for manual search
      if (e.key === 'Enter' && selectedItem) {
        e.preventDefault();
        handleManualSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectItem(searchResults[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectItem = async (item) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSearchResults([]);
    
    // Fetch data with current filters
    await fetchItemData(item);
  };

  const fetchItemData = async (item) => {
    setLoading(true);

    try {
      // Construct the item ID based on filters
      let itemId = item.itemId;
      
      // If tier filter is set and item is gear, construct tier-specific itemId
      if (selectedTier !== 'all' && ItemUtils.isGearItem(item.itemId)) {
        const baseId = ItemUtils.getBaseItemId(item.itemId);
        // Replace the tier part with selected tier
        itemId = baseId.replace(/^T\d+/, selectedTier);
      }
      
      // If enchant filter is set, add enchantment suffix
      if (selectedEnchant !== 'all' && selectedEnchant !== '0') {
        itemId = ItemUtils.getBaseItemId(itemId) + `@${selectedEnchant}`;
      }
      
      console.log('Fetching data for itemId:', itemId, 'from base item:', item.itemId);
      
      // Determine which quality to use for API calls
      const qualityForAPI = selectedQualityFilter === 'all' ? selectedQuality : selectedQualityFilter;
      
      // Load current prices
      const pricesResult = await AlbionAPI.getItemPrices(itemId, {
        locations: selectedCities.join(','),
        qualities: qualityForAPI
      });

      if (pricesResult.success) {
        setCurrentPrices(pricesResult.data);
      }

      // Load price history with both time scales
      const historyResult = await AlbionAPI.getItemHistory(itemId, {
        locations: selectedCities.join(','),
        qualities: qualityForAPI,
        days: 30
      });

      if (historyResult.success) {
        setPriceHistory(historyResult.data);
        setHistoryData(historyResult.data); // Store for chart component
      }
    } catch (error) {
      console.error('Error loading item data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual search button click or Enter key
  const handleManualSearch = async () => {
    if (selectedItem) {
      await fetchItemData(selectedItem);
    }
  };

  // Handle chart time scale change
  const handleChartTimeScaleChange = (newTimeScale) => {
    setChartTimeScale(newTimeScale);
  };

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return price?.toLocaleString() || 'N/A';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="highlight">{part}</span> : 
        part
    );
  };

  const getMatchTypeLabel = (matchType) => {
    switch (matchType) {
      case 'name-start': return 'Name starts with';
      case 'id-start': return 'ID starts with';
      case 'name-contains': return 'Name contains';
      case 'id-contains': return 'ID contains';
      case 'fuzzy': return 'Similar';
      default: return 'Match';
    }
  };

  const forceReloadDatabase = async () => {
    console.log('🔄 Force reloading database...');
    // Reset the loaded state in AlbionAPI
    AlbionAPI.resetDatabase();
    const result = await AlbionAPI.loadItemsDatabase(true);
    console.log('Reload result:', result);
    loadFeaturedItems();
  };

  const testSearch = async () => {
    console.log('🔍 Testing search with "broadsword"...');
    const result = await AlbionAPI.searchItems('broadsword', 10);
    console.log('Test search result:', result);
  };

  return (
    <div className="api-demo">
      <div className="demo-header">
        <h2>Albion Market Data Demo</h2>
        <p>Search for items and view live market prices across all cities</p>
      </div>

      {/* Debug Section - Remove in production */}
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '20px 0', borderRadius: '8px' }}>
        <h4>Debug Tools</h4>
        <div style={{ marginBottom: '10px' }}>
          <strong>Database Status:</strong> 
          <span style={{ 
            color: databaseLoaded ? '#27ae60' : '#e74c3c',
            marginLeft: '10px',
            fontWeight: 'bold'
          }}>
            {databaseLoaded ? '✅ Loaded' : '❌ Not Loaded'}
          </span>
          {initializationError && (
            <div style={{ color: '#e74c3c', marginTop: '5px', fontSize: '12px' }}>
              Error: {initializationError}
            </div>
          )}
        </div>
        <button onClick={forceReloadDatabase} style={{ marginRight: '10px' }}>
          Force Reload Database
        </button>
        <button onClick={testSearch}>
          Test Search "broadsword"
        </button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={databaseLoaded ? 
                "Start typing to search items... (e.g. 'broadsword', 'hideout', 'sword')" : 
                "Loading item database..."
              }
              value={searchQuery}
              onChange={(e) => {
                console.log('Input changed:', e.target.value);
                handleSearch(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowDropdown(true);
                }
              }}
              className="search-input"
              disabled={!databaseLoaded}
              autoComplete="off"
            />
            {showDropdown && searchResults.length > 0 && (
              <div ref={dropdownRef} className="search-results">
                {searchResults.map((item, index) => (
                  <div
                    key={item.itemId}
                    className={`search-result-item ${item.matchType || ''} ${
                      index === selectedIndex ? 'selected' : ''
                    }`}
                    onClick={() => {
                      console.log('Selecting item:', item);
                      selectItem(item);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="item-code">{item.itemId}</div>
                    <div className="item-name">
                      {highlightMatch(item.name, searchQuery)}
                    </div>
                    <div className="match-info">
                      <span className="match-type">{getMatchTypeLabel(item.matchType)}</span>
                      <span className="match-score">Score: {item.score}</span>
                    </div>
                  </div>
                ))}
                <div className="search-footer">
                  <small>Use ↑↓ arrow keys to navigate, Enter to select, Esc to close</small>
                </div>
              </div>
            )}
          </div>
          
          {/* Search Filters - Inline */}
          <div className="search-filters">
            <div className="filter-group">
              <label htmlFor="tier-filter">Tier</label>
              <select 
                id="tier-filter"
                value={selectedTier} 
                onChange={(e) => {
                  setSelectedTier(e.target.value);
                  handleFilterChange();
                }}
                className="filter-select"
              >
                <option value="all">All</option>
                {Object.entries(TIERS).map(([tier, name]) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="enchant-filter">Enchant</label>
              <select 
                id="enchant-filter"
                value={selectedEnchant} 
                onChange={(e) => {
                  setSelectedEnchant(e.target.value);
                  handleFilterChange();
                }}
                className="filter-select"
              >
                <option value="all">All</option>
                {Object.entries(ENCHANTMENTS).map(([level, name]) => (
                  <option key={level} value={level}>{level === '0' ? 'Base' : `+${level}`}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="quality-filter">Quality</label>
              <select 
                id="quality-filter"
                value={selectedQualityFilter} 
                onChange={(e) => {
                  setSelectedQualityFilter(e.target.value);
                  handleFilterChange();
                }}
                className="filter-select"
              >
                <option value="all">All</option>
                {Object.entries(QUALITIES).map(([level, name]) => (
                  <option key={level} value={level}>{name}</option>
                ))}
              </select>
            </div>
            
            {/* Search Button */}
            <div className="filter-group">
              <label>&nbsp;</label>
              <button 
                onClick={handleManualSearch}
                disabled={!selectedItem || loading}
                className="search-button"
                title="Search with current filters (or press Enter)"
              >
                {loading ? '⟳' : '🔍'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Items */}
      {!selectedItem && (
        <div className="featured-section">
          <h3>Popular Items</h3>
          <div className="featured-grid">
            {featuredItems.map((item) => (
              <div
                key={item.itemId}
                className="featured-item"
                onClick={() => selectItem(item)}
              >
                <div className="item-code">{item.itemId}</div>
                <div className="item-name">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedItem && (
        <div className="filters-section">
          <div className="filter-group">
            <label>Cities:</label>
            <div className="city-checkboxes">
              {Object.entries(CITIES).map(([city, data]) => (
                <label key={city} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedCities.includes(city)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCities([...selectedCities, city]);
                      } else {
                        setSelectedCities(selectedCities.filter(c => c !== city));
                      }
                    }}
                  />
                  <span className="city-icon" style={{ backgroundColor: data.color }}>
                    {data.icon}
                  </span>
                  {city}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Quality:</label>
            <select 
              value={selectedQuality} 
              onChange={(e) => setSelectedQuality(e.target.value)}
            >
              {Object.entries(QUALITIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Time Scale:</label>
            <select 
              value={timeScale} 
              onChange={(e) => setTimeScale(e.target.value)}
            >
              {Object.entries(TIME_SCALES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => selectItem(selectedItem)}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      )}

      {/* Price Chart Component */}
      {selectedItem && historyData && (
        <PriceChart 
          historyData={historyData}
          selectedItem={selectedItem}
          onTimeScaleChange={handleChartTimeScaleChange}
          currentTimeScale={chartTimeScale}
        />
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading market data...</div>
        </div>
      )}
    </div>
  );
};

export default ApiDemo;
