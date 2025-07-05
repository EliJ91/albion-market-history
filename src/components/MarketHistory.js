import React, { useState, useEffect } from 'react';
import './MarketHistory.css';
import { AlbionAPI, CITIES } from '../services/AlbionAPI';

const MarketHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]); // Will be loaded from API

  // Load default item and favorites
  useEffect(() => {
    loadFeaturedItems();
    const defaultItem = { itemId: 'T4_BAG', name: "Adept's Bag" };
    setSelectedItem(defaultItem);
    loadItemData(defaultItem.itemId);
  }, []);

  const loadFeaturedItems = async () => {
    const result = await AlbionAPI.getFeaturedItems(5);
    if (result.success) {
      setFavorites(result.data);
    }
  };

  const loadItemData = async (itemId) => {
    setLoading(true);
    try {
      // Load current prices
      const pricesResult = await AlbionAPI.getItemPrices(itemId);
      if (pricesResult.success) {
        setCurrentPrices(pricesResult.data);
      }

      // Load price history
      const historyResult = await AlbionAPI.getItemHistory(itemId, { days: 7 });
      if (historyResult.success) {
        setPriceHistory(historyResult.data);
      }
    } catch (error) {
      console.error('Error loading item data:', error);
    }
    setLoading(false);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    loadItemData(item.itemId);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    // In real app, would search through actual item database
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat().format(price);
  };

  const getCityIcon = (cityName) => {
    return CITIES[cityName]?.icon || '🏛️';
  };

  const getCityColor = (cityName) => {
    return CITIES[cityName]?.color || '#ffffff';
  };

  return (
    <div className="market-history">
      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search for an item..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="market-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="favorites-section">
            <h3>FAVORITES</h3>
            <div className="favorites-list">
              {favorites.map((item, index) => (
                <div 
                  key={item.itemId} 
                  className="favorite-item"
                  onClick={() => handleItemSelect(item)}
                >
                  <div className="item-icon">{item.itemId.charAt(0)}</div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{formatPrice(28900 + index * 1000)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {selectedItem && (
            <>
              {/* Item Header */}
              <div className="item-header">
                <div className="item-icon-large">B</div>
                <h1 className="item-title">{selectedItem.name || "ELDER'S BOW"}</h1>
              </div>

              {/* Cities */}
              <div className="cities-section">
                {Object.keys(CITIES).slice(0, 4).map(cityName => (
                  <div key={cityName} className="city-item">
                    <span 
                      className="city-icon"
                      style={{ color: getCityColor(cityName) }}
                    >
                      {getCityIcon(cityName)}
                    </span>
                    <span className="city-name">{cityName}</span>
                  </div>
                ))}
              </div>

              {/* Price History Chart */}
              <div className="chart-section">
                <h3>PRICE HISTORY</h3>
                <div className="chart-container">
                  {loading ? (
                    <div className="loading">Loading chart...</div>
                  ) : (
                    <div className="chart-placeholder">
                      <svg width="100%" height="200" viewBox="0 0 400 200">
                        {/* Mock chart line */}
                        <polyline
                          fill="none"
                          stroke="#ff9500"
                          strokeWidth="2"
                          points="50,150 100,120 150,130 200,100 250,110 300,90 350,80"
                        />
                        {/* Data points */}
                        {[50,100,150,200,250,300,350].map((x, i) => {
                          const y = [150,120,130,100,110,90,80][i];
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#ff9500"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}
                  <div className="chart-labels">
                    <span>6 days ago</span>
                    <span>7 days ago</span>
                    <span>Yesterday</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Current Prices */}
              <div className="prices-section">
                <h3>CURRENT PRICES</h3>
                <div className="prices-grid">
                  {Object.keys(CITIES).slice(0, 4).map((cityName, index) => (
                    <div key={cityName} className="price-card">
                      <div className="price-header">
                        <span 
                          className="city-icon"
                          style={{ color: getCityColor(cityName) }}
                        >
                          {getCityIcon(cityName)}
                        </span>
                        <span className="city-name">{cityName}</span>
                      </div>
                      <div className="price-value">
                        {formatPrice(129000 + index * 9000)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketHistory;
