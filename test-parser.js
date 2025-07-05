// Test script to debug the parser
import { parseItemsText, searchItems } from './src/utils/itemParser.js';
import { readFileSync } from 'fs';

// Read the items.txt file
const itemsText = readFileSync('./public/items.txt', 'utf8');

// Parse it
const items = parseItemsText(itemsText);

console.log(`Parsed ${items.length} items`);
console.log('First 5 items:', items.slice(0, 5));

// Test search
const searchResults = searchItems(items, 'hideout', 5);
console.log('Search results for "hideout":', searchResults);

const searchResults2 = searchItems(items, 'carrot', 5);
console.log('Search results for "carrot":', searchResults2);
