// Utility to parse JSON item database and create searchable item database

/**
 * Parse the itemDatabase.json file into a structured format
 */
export function parseItemsJSON(itemsJSON) {
  console.log('🔍 Starting to parse itemDatabase.json...');
  const items = [];
  
  try {
    const parsedData = typeof itemsJSON === 'string' ? JSON.parse(itemsJSON) : itemsJSON;
    const entries = Object.entries(parsedData);
    
    console.log(`📝 Parsing itemDatabase.json with ${entries.length} items`);
    
    let id = 1;
    for (const [itemName, itemCode] of entries) {
      if (itemName && itemCode) {
        items.push({
          id: id++,
          itemId: itemCode.trim(), // This is the value used in API calls
          name: itemName.trim(), // This is what users search for
          urlValue: itemCode.trim(), // Keep explicit reference
          searchValue: itemName.trim(), // Keep explicit reference
          searchText: `${itemCode.trim()} ${itemName.trim()}`.toLowerCase()
        });
      }
    }
    
    console.log(`✅ Parse complete: ${items.length} items parsed`);
    if (items.length > 0) {
      console.log('📋 First item:', items[0]);
      console.log('📋 Last item:', items[items.length - 1]);
      
      // Test for broadswords
      const broadswords = items.filter(item => 
        item.name.toLowerCase().includes('broadsword') || 
        item.itemId.toLowerCase().includes('broadsword')
      );
      console.log(`⚔️ Found ${broadswords.length} broadsword items:`, broadswords.slice(0, 3));
    }
    
    return items;
  } catch (error) {
    console.error('❌ Failed to parse JSON:', error);
    return [];
  }
}

/**
 * Parse the items.txt file into a structured format (legacy support)
 * Format: "ID: URL_VALUE : Search Value"
 * Where URL_VALUE is used in API calls and Search Value is what users search for
 */
export function parseItemsText(itemsText) {
  console.log('🔍 Starting to parse items.txt...');
  const lines = itemsText.split('\n');
  const items = [];
  
  console.log(`📝 Parsing items.txt with ${lines.length} lines`);
  
  let skippedLines = 0;
  let parsedLines = 0;
  let failedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines and header lines
    if (!trimmedLine || 
        trimmedLine.includes('URL Value') || 
        trimmedLine.includes('Search Value') ||
        trimmedLine.startsWith('URL Value') ||
        trimmedLine.startsWith('Search Value')) {
      skippedLines++;
      continue;
    }
    
    // Parse format: "   1: UNIQUE_HIDEOUT                                                   : Hideout Construction Kit"
    // More flexible regex to handle extra spaces
    const match = trimmedLine.match(/^(\d+):\s*([A-Z0-9_@]+)\s*:\s*(.+?)$/);
    if (match) {
      const [, id, urlValue, searchValue] = match;
      
      // Only add items that have both URL value and search value
      const cleanUrlValue = urlValue.trim();
      const cleanSearchValue = searchValue.trim();
      
      if (cleanUrlValue && cleanSearchValue) {
        items.push({
          id: parseInt(id, 10),
          itemId: cleanUrlValue, // This is the value used in API calls
          name: cleanSearchValue, // This is what users search for
          urlValue: cleanUrlValue, // Keep explicit reference
          searchValue: cleanSearchValue, // Keep explicit reference
          searchText: `${cleanUrlValue} ${cleanSearchValue}`.toLowerCase()
        });
        parsedLines++;
      }
    } else if (trimmedLine.match(/^\d+:/)) {
      console.log('❌ Failed to parse line', i + 1, ':', trimmedLine);
      failedLines++;
    }
  }
  
  console.log(`✅ Parse complete: ${parsedLines} items parsed, ${skippedLines} lines skipped, ${failedLines} lines failed`);
  if (items.length > 0) {
    console.log('📋 First item:', items[0]);
    console.log('📋 Last item:', items[items.length - 1]);
    
    // Test for broadswords
    const broadswords = items.filter(item => 
      item.name.toLowerCase().includes('broadsword') || 
      item.itemId.toLowerCase().includes('broadsword')
    );
    console.log(`⚔️ Found ${broadswords.length} broadsword items:`, broadswords.slice(0, 3));
  }
  
  return items;
}

/**
 * Search items by name or item code with predictive matching
 */
export function searchItems(items, query, limit = 10) {
  if (!query || query.length < 1) {
    return [];
  }
  
  const searchQuery = query.toLowerCase().trim();
  const matches = [];
  
  for (const item of items) {
    let score = 0;
    const itemName = item.name.toLowerCase();
    const itemId = item.itemId.toLowerCase();
    
    // Exact match on search value (item name) - highest priority
    if (itemName === searchQuery) {
      score = 1000;
    }
    // Exact match on URL value (item code)
    else if (itemId === searchQuery) {
      score = 950;
    }
    // Search value starts with query (predictive)
    else if (itemName.startsWith(searchQuery)) {
      score = 900;
      // Boost score for shorter names (more specific matches)
      score += Math.max(0, 50 - itemName.length);
    }
    // URL value starts with query
    else if (itemId.startsWith(searchQuery)) {
      score = 850;
    }
    // Word boundary matches in name (e.g., "broad" matches "Expert's Broadsword")
    else if (itemName.split(' ').some(word => word.startsWith(searchQuery))) {
      score = 800;
    }
    // Contains query as whole word
    else if (itemName.includes(' ' + searchQuery) || itemName.includes(searchQuery + ' ')) {
      score = 750;
    }
    // Search value contains query anywhere
    else if (itemName.includes(searchQuery)) {
      score = 700;
      // Boost score based on how early the match appears
      const index = itemName.indexOf(searchQuery);
      score += Math.max(0, 50 - index);
    }
    // URL value contains query
    else if (itemId.includes(searchQuery)) {
      score = 650;
    }
    // Fuzzy matching for typos (simple substring matching)
    else if (searchQuery.length >= 3) {
      // Check if most characters match
      let matchCount = 0;
      for (let i = 0; i < searchQuery.length; i++) {
        if (itemName.includes(searchQuery[i])) {
          matchCount++;
        }
      }
      if (matchCount >= Math.ceil(searchQuery.length * 0.7)) {
        score = 500 + matchCount * 10;
      }
    }
    
    if (score > 0) {
      matches.push({ 
        ...item, 
        score,
        matchType: getMatchType(itemName, itemId, searchQuery)
      });
    }
  }
  
  // Sort by score (descending) and return top results
  const sortedMatches = matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Secondary sort by name length (shorter names first for same score)
      return a.name.length - b.name.length;
    });

  // If we have a very high confidence match (90%+ or score >= 900), only show high-quality results
  if (sortedMatches.length > 0 && sortedMatches[0].score >= 900) {
    // Show only results that are within 100 points of the top score, or at least 80% confidence
    const topScore = sortedMatches[0].score;
    const filteredMatches = sortedMatches.filter(match => 
      match.score >= Math.max(topScore - 100, 800)
    );
    return filteredMatches.slice(0, Math.min(limit, 5)); // Limit to 5 high-quality results
  }

  return sortedMatches.slice(0, limit);
}

/**
 * Helper function to determine match type for display purposes
 */
function getMatchType(itemName, itemId, searchQuery) {
  if (itemName.startsWith(searchQuery.toLowerCase())) return 'name-start';
  if (itemId.startsWith(searchQuery.toLowerCase())) return 'id-start';
  if (itemName.includes(searchQuery.toLowerCase())) return 'name-contains';
  if (itemId.includes(searchQuery.toLowerCase())) return 'id-contains';
  return 'fuzzy';
}

/**
 * Get popular/featured items for suggestions
 */
export function getFeaturedItems(items, count = 20) {
  // Filter for commonly traded items (weapons, armor, tools, resources)
  const featured = items.filter(item => {
    const code = item.itemId;
    return (
      // Weapons and armor (T4-T8)
      /^T[4-8]_/.test(code) && 
      (
        code.includes('SWORD') ||
        code.includes('BOW') ||
        code.includes('STAFF') ||
        code.includes('ARMOR') ||
        code.includes('HEAD') ||
        code.includes('SHOES') ||
        code.includes('BAG') ||
        code.includes('CAPE') ||
        code.includes('TOOL')
      )
    ) ||
    // Resources
    code.includes('FIBER') ||
    code.includes('HIDE') ||
    code.includes('ORE') ||
    code.includes('ROCK') ||
    code.includes('WOOD') ||
    // Food and potions
    code.includes('MEAL') ||
    code.includes('POTION');
  });
  
  return featured.slice(0, count);
}

/**
 * Categorize items by type
 */
export function categorizeItems(items) {
  const categories = {
    weapons: [],
    armor: [],
    accessories: [],
    tools: [],
    resources: [],
    consumables: [],
    mounts: [],
    furniture: [],
    other: []
  };
  
  for (const item of items) {
    const code = item.itemId;
    
    if (code.includes('SWORD') || code.includes('BOW') || code.includes('STAFF') || 
        code.includes('HAMMER') || code.includes('AXE') || code.includes('MACE') ||
        code.includes('SPEAR') || code.includes('DAGGER') || code.includes('CROSSBOW')) {
      categories.weapons.push(item);
    }
    else if (code.includes('ARMOR') || code.includes('HEAD') || code.includes('SHOES')) {
      categories.armor.push(item);
    }
    else if (code.includes('BAG') || code.includes('CAPE') || code.includes('RING')) {
      categories.accessories.push(item);
    }
    else if (code.includes('TOOL_')) {
      categories.tools.push(item);
    }
    else if (code.includes('FIBER') || code.includes('HIDE') || code.includes('ORE') || 
             code.includes('ROCK') || code.includes('WOOD') || code.match(/^T\d+_[A-Z]+$/)) {
      categories.resources.push(item);
    }
    else if (code.includes('MEAL') || code.includes('POTION') || code.includes('FISH')) {
      categories.consumables.push(item);
    }
    else if (code.includes('HORSE') || code.includes('OX') || code.includes('WOLF') || 
             code.includes('MOUNT')) {
      categories.mounts.push(item);
    }
    else if (code.includes('FURNITURE')) {
      categories.furniture.push(item);
    }
    else {
      categories.other.push(item);
    }
  }
  
  return categories;
}
