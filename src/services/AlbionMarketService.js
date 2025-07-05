const ALBION_API_BASE = 'https://www.albion-online-data.com/api/v2/stats';

class AlbionMarketService {
  // Get current market prices for an item
  async getItemPrices(itemId, locations = 'Caerleon,Bridgewatch,Lymhurst,Martlock,Thetford,FortSterling', qualities = '1,2,3,4,5') {
    try {
      const url = new URL(`${ALBION_API_BASE}/prices/${itemId}`);
      url.searchParams.append('locations', locations);
      url.searchParams.append('qualities', qualities);
      
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
        error: 'Failed to fetch market data',
        message: error.message
      };
    }
  }

  // Get price history for an item
  async getItemHistory(itemId, locations = 'Caerleon', qualities = '1', timeScale = '24') {
    try {
      const url = new URL(`${ALBION_API_BASE}/history/${itemId}`);
      url.searchParams.append('locations', locations);
      url.searchParams.append('qualities', qualities);
      url.searchParams.append('time_scale', timeScale);
      
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
        error: 'Failed to fetch price history',
        message: error.message
      };
    }
  }

  // Get multiple item prices
  async getBulkPrices(itemIds, locations = 'Caerleon,Bridgewatch,Lymhurst,Martlock,Thetford,FortSterling', qualities = '1,2,3,4,5') {
    try {
      const itemList = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
      const url = new URL(`${ALBION_API_BASE}/prices/${itemList}`);
      url.searchParams.append('locations', locations);
      url.searchParams.append('qualities', qualities);
      
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
        error: 'Failed to fetch bulk market data',
        message: error.message
      };
    }
  }

  // Mock market stats (since we can't store this data without a backend)
  getMarketStats() {
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

  // Sample items data
  getItems() {
    const sampleItems = [
      { id: 'T4_BAG', name: 'Adept\'s Bag', tier: 4, category: 'Accessories' },
      { id: 'T5_SHOE_LEATHER_SET1', name: 'Expert\'s Leather Shoes', tier: 5, category: 'Armor' },
      { id: 'T6_HEAD_PLATE_SET1', name: 'Master\'s Plate Helmet', tier: 6, category: 'Armor' },
      { id: 'T3_TOOL_HAMMER', name: 'Journeyman\'s Hammer', tier: 3, category: 'Tools' },
      { id: 'T4_ARMOR_CLOTH_SET1', name: 'Adept\'s Cloth Robe', tier: 4, category: 'Armor' },
      { id: 'T5_MAIN_SWORD', name: 'Expert\'s Broadsword', tier: 5, category: 'Weapons' },
      { id: 'T6_OFF_SHIELD', name: 'Master\'s Shield', tier: 6, category: 'Weapons' },
      { id: 'T4_MEAL_SOUP', name: 'Adept\'s Fish Soup', tier: 4, category: 'Consumables' }
    ];

    return {
      success: true,
      data: sampleItems,
      total: sampleItems.length,
      timestamp: new Date().toISOString()
    };
  }
}

export default new AlbionMarketService();
