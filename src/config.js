export const REGIONS = {
  americas: {
    label: 'Americas',
    apiBase: 'https://west.albion-online-data.com/api/v2/stats',
  },
  europe: {
    label: 'Europe',
    apiBase: 'https://europe.albion-online-data.com/api/v2/stats',
  },
  asia: {
    label: 'Asia',
    apiBase: 'https://east.albion-online-data.com/api/v2/stats',
  },
};

export const QUALITY_LABELS = {
  1: 'Normal',
  2: 'Good',
  3: 'Outstanding',
  4: 'Excellent',
  5: 'Masterpiece',
};

export const TIME_RANGES = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '4 weeks', days: 28 },
];

export const REST_MARKET_LOCATIONS = [
  'Arthurs Rest Smugglers Network',
  'Merlyns Rest Smugglers Network',
  'Morganas Rest Smugglers Network',
];

export const BLACK_MARKET_LOCATION = 'Black Market';

export const SPECIAL_MARKET_LOCATIONS = [
  ...REST_MARKET_LOCATIONS,
  BLACK_MARKET_LOCATION,
];

export const STORAGE_KEY = 'albion-market-history:cards:v2';
