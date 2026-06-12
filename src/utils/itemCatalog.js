import itemDatabase from '../data/itemDatabase.json';
import itemValues from '../data/itemValues.json';

const RAW_RESOURCE_TYPES = new Set(['WOOD', 'ROCK', 'ORE', 'HIDE', 'FIBER']);

export function normalizeSearch(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function parseSearchQuery(query) {
  const trimmedQuery = query.trim();
  const match = trimmedQuery.match(/(?:^|\s)([1-8])\.([0-4])(?=\s|$)/);

  if (!match) {
    return { enchantment: null, query: trimmedQuery, tier: null };
  }

  return {
    enchantment: Number(match[2]),
    query: `${trimmedQuery.slice(0, match.index)} ${trimmedQuery.slice(match.index + match[0].length)}`.trim(),
    tier: Number(match[1]),
  };
}

export function getTier(itemId) {
  const match = itemId.match(/^T(\d+)_/);
  return match ? Number(match[1]) : null;
}

export function getEnchantment(itemId) {
  const match = itemId.match(/@(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function stripItemModifiers(itemId) {
  return itemId.replace(/_LEVEL\d+@\d+$/, '').replace(/@\d+$/, '');
}

export function isRawResource(itemId) {
  const baseId = stripItemModifiers(itemId);
  const match = baseId.match(/^T\d+_([A-Z]+)$/);
  return match ? RAW_RESOURCE_TYPES.has(match[1]) : false;
}

export function canChangeTier(itemId) {
  return getTier(itemId) !== null;
}

export function canEnchant(itemId) {
  const tier = getTier(itemId);
  return tier !== null && tier >= 4;
}

export function buildItemId(itemId, tier, enchantment) {
  let baseId = stripItemModifiers(itemId);

  if (tier && canChangeTier(baseId)) {
    baseId = baseId.replace(/^T\d+_/, `T${tier}_`);
  }

  const enchant = Number(enchantment) || 0;
  if (enchant === 0) return baseId;

  return isRawResource(baseId)
    ? `${baseId}_LEVEL${enchant}@${enchant}`
    : `${baseId}@${enchant}`;
}

export const ITEM_CATALOG = Object.entries(itemDatabase).map(([name, itemId]) => ({
  name,
  itemId,
  normalizedName: normalizeSearch(name),
  normalizedId: normalizeSearch(itemId),
}));

const ITEM_NAME_BY_ID = new Map(ITEM_CATALOG.map((item) => [item.itemId, item.name]));
const ITEM_BY_ID = new Map(ITEM_CATALOG.map((item) => [item.itemId, item]));
const TIERS_BY_FAMILY = new Map();

for (const item of ITEM_CATALOG) {
  const tier = getTier(item.itemId);
  if (tier === null) continue;
  const family = stripItemModifiers(item.itemId).replace(/^T\d+_/, 'T#_');
  if (!TIERS_BY_FAMILY.has(family)) TIERS_BY_FAMILY.set(family, new Set());
  TIERS_BY_FAMILY.get(family).add(tier);
}

export function getAvailableTiers(itemId) {
  if (!canChangeTier(itemId)) return [];
  const family = stripItemModifiers(itemId).replace(/^T\d+_/, 'T#_');
  return [...(TIERS_BY_FAMILY.get(family) || [])].sort((a, b) => a - b);
}

export function getItemName(itemId, fallback = itemId) {
  return ITEM_NAME_BY_ID.get(itemId) || ITEM_NAME_BY_ID.get(stripItemModifiers(itemId)) || fallback;
}

export function getItemValue(itemId) {
  return itemValues[itemId] ?? null;
}

export function getEquivalentItem(itemId, tier, enchantment = getEnchantment(itemId)) {
  const equivalentId = buildItemId(itemId, tier, enchantment);
  const baseEquivalentId = buildItemId(itemId, tier, 0);
  return ITEM_BY_ID.get(equivalentId) || ITEM_BY_ID.get(baseEquivalentId) || null;
}

export function searchItems(query, limit = 10) {
  const parsedQuery = parseSearchQuery(query);
  const normalizedQuery = normalizeSearch(parsedQuery.query);
  if (normalizedQuery.length < 2) return [];

  const results = ITEM_CATALOG
    .map((item) => {
      let score = 0;

      if (item.normalizedName === normalizedQuery) score = 100;
      else if (item.normalizedId === normalizedQuery) score = 95;
      else if (item.normalizedName.startsWith(normalizedQuery)) score = 90;
      else if (item.name.toLowerCase().split(/\s+/).some((word) => normalizeSearch(word).startsWith(normalizedQuery))) score = 80;
      else if (item.normalizedName.includes(normalizedQuery)) score = 70;
      else if (item.normalizedId.includes(normalizedQuery)) score = 60;

      return score ? { ...item, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.score - a.score
      || (getTier(a.itemId) ?? Number.MAX_SAFE_INTEGER) - (getTier(b.itemId) ?? Number.MAX_SAFE_INTEGER)
      || a.name.length - b.name.length
      || a.name.localeCompare(b.name)
    ));

  if (parsedQuery.tier === null) return results.slice(0, limit);

  const requestedItems = new Map();
  for (const item of results) {
    if (!getAvailableTiers(item.itemId).includes(parsedQuery.tier)) continue;

    const itemId = buildItemId(item.itemId, parsedQuery.tier, parsedQuery.enchantment);
    if (requestedItems.has(itemId)) continue;

    requestedItems.set(itemId, {
      ...item,
      itemId,
      name: getItemName(itemId, item.name),
      normalizedId: normalizeSearch(itemId),
      normalizedName: normalizeSearch(getItemName(itemId, item.name)),
    });
  }

  return [...requestedItems.values()].slice(0, limit);
}
