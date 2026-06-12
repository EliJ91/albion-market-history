import { REGIONS, SPECIAL_MARKET_LOCATIONS } from '../config';

const SPECIAL_MARKET_LOCATION_SET = new Set(SPECIAL_MARKET_LOCATIONS);

export function getHistoryUrl(itemId, region = 'americas', locations = []) {
  const selectedRegion = REGIONS[region] || REGIONS.americas;
  const locationQuery = locations.length
    ? `&locations=${locations.map((location) => encodeURIComponent(location)).join(',')}`
    : '';

  return `${selectedRegion.apiBase}/history/${encodeURIComponent(itemId)}.json?time-scale=24${locationQuery}`;
}

export function getMultiHistoryUrl(itemIds, region = 'americas', locations = []) {
  const selectedRegion = REGIONS[region] || REGIONS.americas;
  const locationQuery = locations.length
    ? `&locations=${locations.map((location) => encodeURIComponent(location)).join(',')}`
    : '';
  const encodedItems = itemIds.map((itemId) => encodeURIComponent(itemId)).join(',');

  return `${selectedRegion.apiBase}/history/${encodedItems}.json?time-scale=24${locationQuery}`;
}

async function requestHistory(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Albion market API returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Albion market API returned an unexpected response.');
  }

  return data;
}

function mergeHistory(...historyGroups) {
  const merged = new Map();

  for (const history of historyGroups) {
    for (const entry of history) {
      const key = `${entry.item_id || ''}|${entry.location}|${entry.quality}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, {
          ...entry,
          data: [...(entry.data || [])],
        });
        continue;
      }

      const points = new Map(
        (existing.data || []).map((point) => [point.timestamp, point]),
      );
      for (const point of entry.data || []) points.set(point.timestamp, point);

      existing.data = [...points.values()].sort(
        (left, right) => new Date(left.timestamp) - new Date(right.timestamp),
      );
    }
  }

  return [...merged.values()];
}

export async function fetchHistory(itemId, region, signal) {
  const primaryRequest = requestHistory(getHistoryUrl(itemId, region), signal);
  const specialMarketsRequest = requestHistory(
    getHistoryUrl(itemId, region, SPECIAL_MARKET_LOCATIONS),
    signal,
  ).catch((error) => {
    if (error.name === 'AbortError') throw error;
    return [];
  });

  const [primaryHistory, specialMarketsHistory] = await Promise.all([
    primaryRequest,
    specialMarketsRequest,
  ]);

  return mergeHistory(
    primaryHistory,
    specialMarketsHistory.filter((entry) => SPECIAL_MARKET_LOCATION_SET.has(entry.location)),
  );
}

export async function fetchMultiHistory(itemIds, region, locations = [], signal) {
  if (!itemIds.length) return [];
  if (locations.length) {
    return requestHistory(getMultiHistoryUrl(itemIds, region, locations), signal);
  }

  const primaryRequest = requestHistory(getMultiHistoryUrl(itemIds, region), signal);
  const specialMarketsRequest = requestHistory(
    getMultiHistoryUrl(itemIds, region, SPECIAL_MARKET_LOCATIONS),
    signal,
  ).catch((error) => {
    if (error.name === 'AbortError') throw error;
    return [];
  });
  const [primaryHistory, specialMarketsHistory] = await Promise.all([
    primaryRequest,
    specialMarketsRequest,
  ]);

  return mergeHistory(
    primaryHistory,
    specialMarketsHistory.filter((entry) => SPECIAL_MARKET_LOCATION_SET.has(entry.location)),
  );
}
