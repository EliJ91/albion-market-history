import { parseItemsJSON, parseItemsText, searchItems, getFeaturedItems } from '../utils/itemParser.js';
import itemDatabase from '../data/itemDatabase.json';

// API endpoints based on server regions
const API_ENDPOINTS = {
  americas: 'https://west.albion-online-data.com/api/v2/stats',
  asia: 'https://east.albion-online-data.com/api/v2/stats', 
  europe: 'https://europe.albion-online-data.com/api/v2/stats'
};

// Default to Americas server
const ALBION_API_BASE = API_ENDPOINTS.americas;

// Item database - will be loaded from items.txt
let ITEM_DATABASE = [];
let ITEMS_LOADED = false;

// City data with API location names
export const CITIES = {
  'Caerleon': { icon: 'C', color: '#ea4335', apiName: 'Caerleon' },
  'Bridgewatch': { icon: 'B', color: '#fbbc04', apiName: 'Bridgewatch' },
  'Lymhurst': { icon: 'L', color: '#34a853', apiName: 'Lymhurst' },
  'Martlock': { icon: 'M', color: '#4285f4', apiName: 'Martlock' },
  'Thetford': { icon: 'T', color: '#673ab7', apiName: 'Thetford' },
  'Fort Sterling': { icon: 'F', color: '#9aa0a6', apiName: 'Fort Sterling' }
};

// Quality levels for items
export const QUALITIES = {
  1: 'Normal',
  2: 'Good', 
  3: 'Outstanding',
  4: 'Excellent',
  5: 'Masterpiece'
};

// Time scales for historical data
export const TIME_SCALES = {
  1: '1 Hour',
  6: '6 Hours', 
  24: '24 Hours (Daily)'
};

// Tier mappings for gear items
export const TIERS = {
  T3: 'Novice',
  T4: 'Adept', 
  T5: 'Expert',
  T6: 'Master',
  T7: 'Grandmaster',
  T8: 'Elder'
};

// Enchantment levels
export const ENCHANTMENTS = {
  0: 'Base (No Enchant)',
  1: 'Enchant Level 1',
  2: 'Enchant Level 2', 
  3: 'Enchant Level 3',
  4: 'Enchant Level 4'
};

// Item parsing utilities
export const ItemUtils = {
  // Extract tier from item ID (T3, T4, T5, etc.)
  getTierFromItemId(itemId) {
    const match = itemId.match(/^T(\d+)/);
    return match ? `T${match[1]}` : null;
  },

  // Extract enchantment level from item ID (@1, @2, @3, @4)
  getEnchantFromItemId(itemId) {
    const match = itemId.match(/@(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  },

  // Get base item ID without enchantment
  getBaseItemId(itemId) {
    return itemId.replace(/@\d+$/, '');
  },

  // Check if item is gear/equipment (has tier prefix)
  isGearItem(itemId) {
    return /^T\d+_/.test(itemId);
  },

  // Get tier name from tier code
  getTierName(tierCode) {
    return TIERS[tierCode] || tierCode;
  },

  // Get all available tiers for filtering
  getAvailableTiers() {
    return Object.keys(TIERS);
  },

  // Get all available enchantments for filtering
  getAvailableEnchantments() {
    return Object.keys(ENCHANTMENTS).map(Number);
  },

  // Filter items by tier, enchant, and quality
  filterItems(items, filters) {
    const { tier, enchant, quality } = filters;
    
    return items.filter(item => {
      // Tier filter
      if (tier && tier !== 'all') {
        const itemTier = this.getTierFromItemId(item.itemId);
        if (itemTier !== tier) return false;
      }

      // Enchantment filter
      if (enchant !== undefined && enchant !== 'all') {
        const itemEnchant = this.getEnchantFromItemId(item.itemId);
        if (itemEnchant !== parseInt(enchant)) return false;
      }

      // Quality filter (this would be applied during API calls, not item filtering)
      // Quality is not part of the item ID, it's a market data parameter

      return true;
    });
  }
};

// API service for calling Albion Online API directly
export const AlbionAPI = {
  // Reset the database state (for debugging)
  resetDatabase() {
    ITEMS_LOADED = false;
    ITEM_DATABASE = [];
    console.log('🔄 Database state reset');
  },

  // Load items database from JSON file (direct import - fastest)
  async loadItemsDatabase(forceReload = false) {
    console.log('🔄 loadItemsDatabase called, forceReload:', forceReload);
    console.log('🔄 Current state - ITEMS_LOADED:', ITEMS_LOADED, 'ITEM_DATABASE.length:', ITEM_DATABASE.length);
    
    if (ITEMS_LOADED && !forceReload) {
      console.log(`Items already loaded: ${ITEM_DATABASE.length} items`);
      return ITEM_DATABASE;
    }
    
    try {
      // Use imported JSON directly (fastest - no network request)
      console.log('📄 Using imported itemDatabase.json...');
      ITEM_DATABASE = parseItemsJSON(itemDatabase);
      ITEMS_LOADED = true;
      console.log(`✅ Successfully loaded ${ITEM_DATABASE.length} items from JSON database`);
      
      if (ITEM_DATABASE.length > 0) {
        console.log('📋 First item:', ITEM_DATABASE[0]);
        console.log('📋 Sample items with "broadsword":', ITEM_DATABASE.filter(item => 
          item.name.toLowerCase().includes('broadsword') || 
          item.itemId.toLowerCase().includes('broadsword')
        ).slice(0, 3));
      } else {
        console.error('❌ No items were parsed from the JSON file!');
      }
      
      return ITEM_DATABASE;
    } catch (error) {
      console.error('❌ Failed to load JSON database:', error);
      ITEMS_LOADED = false;
      ITEM_DATABASE = [];
      return [];
    }
  },

  // Get current prices for an item across all cities and qualities
  async getItemPrices(itemId, options = {}) {
    try {
      // Always fetch ALL data - no location or quality filters
      const url = `${ALBION_API_BASE}/prices/${itemId}`;
      console.log('🔗 Fetching ALL price data from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get price history for an item with both time scales
  async getItemHistory(itemId, options = {}) {
    try {
      console.log('🔗 Fetching price history for both time scales...');
      
      // Fetch both hourly and daily data simultaneously - ALL data (no filters)
      const [hourlyResponse, dailyResponse] = await Promise.all([
        // Hourly data (time-scale=1)
        fetch(`${ALBION_API_BASE}/history/${itemId}?time-scale=1`),
        // Daily data (time-scale=24)
        fetch(`${ALBION_API_BASE}/history/${itemId}?time-scale=24`)
      ]);
      
      console.log('📊 Hourly URL:', `${ALBION_API_BASE}/history/${itemId}?time-scale=1`);
      console.log('📊 Daily URL:', `${ALBION_API_BASE}/history/${itemId}?time-scale=24`);
      
      if (!hourlyResponse.ok || !dailyResponse.ok) {
        throw new Error(`HTTP error! Hourly: ${hourlyResponse.status}, Daily: ${dailyResponse.status}`);
      }
      
      const [hourlyData, dailyData] = await Promise.all([
        hourlyResponse.json(),
        dailyResponse.json()
      ]);
      
      console.log('📊 Received hourly data points:', hourlyData.length);
      console.log('📊 Received daily data points:', dailyData.length);
      
      // Organize data by time scale and city
      const organizedData = {
        1: {}, // hourly
        24: {} // daily
      };
      
      // Process hourly data
      hourlyData.forEach(dataPoint => {
        const cityName = dataPoint.city;
        if (!organizedData[1][cityName]) {
          organizedData[1][cityName] = [];
        }
        organizedData[1][cityName].push({
          timestamp: dataPoint.timestamp,
          avg_price: dataPoint.avg_price,
          item_count: dataPoint.item_count,
          quality: dataPoint.quality || 1
        });
      });
      
      // Process daily data
      dailyData.forEach(dataPoint => {
        const cityName = dataPoint.city;
        if (!organizedData[24][cityName]) {
          organizedData[24][cityName] = [];
        }
        organizedData[24][cityName].push({
          timestamp: dataPoint.timestamp,
          avg_price: dataPoint.avg_price,
          item_count: dataPoint.item_count,
          quality: dataPoint.quality || 1
        });
      });
      
      // Sort data by timestamp for each city and time scale
      Object.keys(organizedData).forEach(timeScale => {
        Object.keys(organizedData[timeScale]).forEach(city => {
          organizedData[timeScale][city].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      });
      
      console.log('✅ Successfully fetched history data for both time scales');
      console.log('📊 Hourly data points:', Object.values(organizedData[1]).flat().length);
      console.log('📊 Daily data points:', Object.values(organizedData[24]).flat().length);
      
      return {
        success: true,
        data: organizedData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to fetch history data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Search items from the loaded database with filters
  async searchItems(query, limit = 10, filters = {}) {
    try {
      console.log('Search called with query:', query, 'filters:', filters);
      console.log('ITEMS_LOADED status:', ITEMS_LOADED);
      console.log('Current database size:', ITEM_DATABASE.length);
      
      if (!ITEMS_LOADED || ITEM_DATABASE.length === 0) {
        console.log('Items not loaded or empty database, loading now...');
        await this.loadItemsDatabase(true); // Force reload
      }
      
      console.log('Database has', ITEM_DATABASE.length, 'items');
      
      // First get search results
      let results = searchItems(ITEM_DATABASE, query, Math.max(limit * 5, 100)); // Get more results for filtering
      
      // Apply filters if provided
      if (filters.tier || filters.enchant !== undefined) {
        results = ItemUtils.filterItems(results, filters);
      }
      
      // Trim to requested limit
      results = results.slice(0, limit);
      
      console.log('Search results after filtering:', results);
      return {
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get featured/popular items
  async getFeaturedItems(count = 20) {
    try {
      if (!ITEMS_LOADED) {
        await this.loadItemsDatabase();
      }
      
      const featured = getFeaturedItems(ITEM_DATABASE, count);
      return {
        success: true,
        data: featured,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get all items in database
  async getAllItems() {
    try {
      if (!ITEMS_LOADED) {
        await this.loadItemsDatabase();
      }
      
      return {
        success: true,
        data: ITEM_DATABASE,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Mock data for features not available in public API
  async getMarketStats() {
    return {
      success: true,
      data: {
        totalItems: 1247,
        activeItems: 89,
        totalTransactions: 15000,
        averagePrice: 2500,
        topGainers: [
          { itemId: 'T4_BAG', name: 'Adept\'s Bag', change: '+15.2%' },
          { itemId: 'T5_SHOE_LEATHER_SET1', name: 'Expert\'s Leather Shoes', change: '+12.8%' },
          { itemId: 'T6_HEAD_PLATE_SET1', name: 'Master\'s Plate Helmet', change: '+9.3%' }
        ],
        topLosers: [
          { itemId: 'T3_TOOL_HAMMER', name: 'Journeyman\'s Hammer', change: '-8.1%' },
          { itemId: 'T4_ARMOR_CLOTH_SET1', name: 'Adept\'s Cloth Robe', change: '-5.7%' }
        ]
      },
      timestamp: new Date().toISOString()
    };
  }
};

export default AlbionAPI;
