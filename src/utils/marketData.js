import { REST_MARKET_LOCATIONS } from '../config';

const CITY_COLORS = {
  'Arthurs Rest Smugglers Network': '#000000',
  'Black Market': '#8a0303',
  Brecilien: '#b8c7ff',
  Bridgewatch: '#f97316',
  Caerleon: '#f43f5e',
  'Fort Sterling': '#e2e8f0',
  Lymhurst: '#4ade80',
  Martlock: '#1565d8',
  'Merlyns Rest Smugglers Network': '#000000',
  'Morganas Rest Smugglers Network': '#000000',
  Thetford: '#a78bfa',
};

const FALLBACK_COLORS = ['#2dd4bf', '#fb7185', '#f97316', '#38bdf8', '#e879f9', '#a3e635'];

const LOCATION_LABELS = {
  'Arthurs Rest Smugglers Network': 'Arthurs Rest',
  'Merlyns Rest Smugglers Network': 'Merlyns Rest',
  'Morganas Rest Smugglers Network': 'Morganas Rest',
};

const REST_LOCATION_ORDER = new Map(
  REST_MARKET_LOCATIONS.map((location, index) => [location, index]),
);

export function getCityColor(city) {
  if (CITY_COLORS[city]) return CITY_COLORS[city];

  const hash = [...city].reduce((total, character) => total + character.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function getLocationLabel(location) {
  return LOCATION_LABELS[location] || location;
}

function compareLocations(left, right) {
  const leftRestOrder = REST_LOCATION_ORDER.get(left);
  const rightRestOrder = REST_LOCATION_ORDER.get(right);
  const leftIsRest = leftRestOrder != null;
  const rightIsRest = rightRestOrder != null;

  if (leftIsRest && rightIsRest) return leftRestOrder - rightRestOrder;
  if (leftIsRest) return 1;
  if (rightIsRest) return -1;

  return getLocationLabel(left).localeCompare(getLocationLabel(right));
}

export function getLocations(history, requiredLocations = []) {
  return [...new Set([
    ...history.map((entry) => entry.location),
    ...requiredLocations,
  ])].sort(compareLocations);
}

export function combineQualities(history) {
  const grouped = new Map();

  for (const entry of history) {
    for (const point of entry.data || []) {
      const key = `${entry.location}|${point.timestamp}`;
      const current = grouped.get(key) || {
        location: entry.location,
        timestamp: point.timestamp,
        weightedPrice: 0,
        itemCount: 0,
      };
      const itemCount = Number(point.item_count) || 0;
      current.weightedPrice += (Number(point.avg_price) || 0) * itemCount;
      current.itemCount += itemCount;
      grouped.set(key, current);
    }
  }

  const byLocation = new Map();
  for (const point of grouped.values()) {
    if (point.itemCount === 0) continue;
    if (!byLocation.has(point.location)) byLocation.set(point.location, []);
    byLocation.get(point.location).push({
      timestamp: point.timestamp,
      avg_price: Math.round(point.weightedPrice / point.itemCount),
      item_count: point.itemCount,
    });
  }

  return [...byLocation.entries()].map(([location, data]) => ({
    location,
    quality: 0,
    data: data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  }));
}

export function filterHistory(
  history,
  {
    quality = 1,
    averageQualities = false,
    locations = [],
    days = 28,
    now = Date.now(),
  } = {},
) {
  const source = averageQualities ? combineQualities(history) : history.filter((entry) => entry.quality === Number(quality));
  const cutoff = now - Number(days) * 24 * 60 * 60 * 1000;
  const selectedLocations = new Set(locations);

  return source
    .filter((entry) => selectedLocations.size === 0 || selectedLocations.has(entry.location))
    .map((entry) => ({
      ...entry,
      data: (entry.data || []).filter((point) => new Date(point.timestamp).getTime() >= cutoff),
    }))
    .filter((entry) => entry.data.length > 0);
}

export function getRecommendedLocation(history, metric = 'avg_price') {
  const ranked = history
    .map((entry) => {
      const totals = (entry.data || []).reduce(
        (result, point) => {
          const itemCount = Number(point.item_count) || 0;
          const averagePrice = Number(point.avg_price) || 0;
          return {
            itemCount: result.itemCount + itemCount,
            weightedPrice: result.weightedPrice + averagePrice * itemCount,
          };
        },
        { itemCount: 0, weightedPrice: 0 },
      );

      return {
        location: entry.location,
        score: metric === 'item_count'
          ? totals.itemCount
          : totals.itemCount > 0
            ? totals.weightedPrice / totals.itemCount
            : 0,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.location.localeCompare(b.location));

  return ranked[0]?.location || null;
}
