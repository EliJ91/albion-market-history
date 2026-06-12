import { describe, expect, it } from 'vitest';
import {
  combineQualities,
  filterHistory,
  getCityColor,
  getLocationLabel,
  getLocations,
  getRecommendedLocation,
} from './marketData';

const history = [
  {
    location: 'Caerleon',
    quality: 1,
    data: [
      { timestamp: '2026-06-01T00:00:00', avg_price: 100, item_count: 10 },
      { timestamp: '2026-06-05T00:00:00', avg_price: 200, item_count: 20 },
    ],
  },
  {
    location: 'Caerleon',
    quality: 2,
    data: [
      { timestamp: '2026-06-05T00:00:00', avg_price: 400, item_count: 10 },
    ],
  },
  {
    location: 'Brecilien',
    quality: 1,
    data: [
      { timestamp: '2026-06-05T00:00:00', avg_price: 150, item_count: 5 },
    ],
  },
];

describe('market data transforms', () => {
  it('discovers every city returned by the API', () => {
    expect(getLocations(history)).toEqual(['Brecilien', 'Caerleon']);
  });

  it('adds required markets even when the API has no history for them', () => {
    expect(getLocations(history, ['Black Market', 'Arthurs Rest Smugglers Network'])).toEqual([
      'Black Market',
      'Brecilien',
      'Caerleon',
      'Arthurs Rest Smugglers Network',
    ]);
  });

  it('groups the Rests together after the other cities', () => {
    expect(getLocations(history, [
      'Morganas Rest Smugglers Network',
      'Thetford',
      'Arthurs Rest Smugglers Network',
      'Merlyns Rest Smugglers Network',
      'Black Market',
    ])).toEqual([
      'Black Market',
      'Brecilien',
      'Caerleon',
      'Thetford',
      'Arthurs Rest Smugglers Network',
      'Merlyns Rest Smugglers Network',
      'Morganas Rest Smugglers Network',
    ]);
  });

  it('shows short Rest names without the API-only suffix', () => {
    expect(getLocationLabel('Arthurs Rest Smugglers Network')).toBe('Arthurs Rest');
    expect(getLocationLabel('Merlyns Rest Smugglers Network')).toBe('Merlyns Rest');
    expect(getLocationLabel('Morganas Rest Smugglers Network')).toBe('Morganas Rest');
    expect(getLocationLabel('Black Market')).toBe('Black Market');
  });

  it('uses black for the Rests and blood red for the Black Market', () => {
    expect(getCityColor('Arthurs Rest Smugglers Network')).toBe('#000000');
    expect(getCityColor('Merlyns Rest Smugglers Network')).toBe('#000000');
    expect(getCityColor('Morganas Rest Smugglers Network')).toBe('#000000');
    expect(getCityColor('Black Market')).toBe('#8a0303');
  });

  it('uses item volume to calculate a weighted quality average', () => {
    const combined = combineQualities(history);
    const juneFifth = combined
      .find((entry) => entry.location === 'Caerleon')
      .data.find((point) => point.timestamp === '2026-06-05T00:00:00');

    expect(juneFifth.avg_price).toBe(267);
    expect(juneFifth.item_count).toBe(30);
  });

  it('applies date, city, and quality filters on the client', () => {
    const filtered = filterHistory(history, {
      quality: 1,
      locations: ['Caerleon'],
      days: 3,
      now: new Date('2026-06-06T00:00:00').getTime(),
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].data).toEqual([
      { timestamp: '2026-06-05T00:00:00', avg_price: 200, item_count: 20 },
    ]);
  });

  it('recommends the highest-volume city for a quick sale', () => {
    expect(getRecommendedLocation(history, 'item_count')).toBe('Caerleon');
  });

  it('recommends the highest volume-weighted price for maximum value', () => {
    const recommendationHistory = [
      {
        location: 'Fast City',
        data: [{ avg_price: 100, item_count: 100 }],
      },
      {
        location: 'Valuable City',
        data: [
          { avg_price: 200, item_count: 10 },
          { avg_price: 400, item_count: 10 },
        ],
      },
    ];

    expect(getRecommendedLocation(recommendationHistory, 'avg_price')).toBe('Valuable City');
  });
});
