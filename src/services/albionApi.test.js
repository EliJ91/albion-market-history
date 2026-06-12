import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHistory, getHistoryUrl } from './albionApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Albion API URLs', () => {
  it('uses the selected server region and safely encodes enchanted IDs', () => {
    expect(getHistoryUrl('T4_ORE_LEVEL1@1', 'europe')).toBe(
      'https://europe.albion-online-data.com/api/v2/stats/history/T4_ORE_LEVEL1%401.json?time-scale=24',
    );
  });

  it('falls back to Americas for an unknown region', () => {
    expect(getHistoryUrl('T4_MAIN_SWORD', 'unknown')).toContain('west.albion-online-data.com');
  });

  it('adds encoded market locations when requested', () => {
    expect(getHistoryUrl('T4_BAG', 'americas', [
      'Arthurs Rest Smugglers Network',
      'Black Market',
    ])).toBe(
      'https://west.albion-online-data.com/api/v2/stats/history/T4_BAG.json?time-scale=24&locations=Arthurs%20Rest%20Smugglers%20Network,Black%20Market',
    );
  });

  it('merges the three Rest markets and Black Market while excluding other Smugglers Network locations', async () => {
    const response = (data) => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    });
    const blackMarket = {
      location: 'Black Market',
      quality: 1,
      data: [{ timestamp: '2026-06-01T00:00:00', avg_price: 100, item_count: 1 }],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(response([
        {
          location: 'Caerleon',
          quality: 1,
          data: [{ timestamp: '2026-06-01T00:00:00', avg_price: 90, item_count: 2 }],
        },
        blackMarket,
      ]))
      .mockReturnValueOnce(response([
        {
          location: 'Arthurs Rest Smugglers Network',
          quality: 1,
          data: [{ timestamp: '2026-06-01T00:00:00', avg_price: 110, item_count: 3 }],
        },
        blackMarket,
        {
          location: 'Unrelated Smugglers Network',
          quality: 1,
          data: [{ timestamp: '2026-06-01T00:00:00', avg_price: 120, item_count: 4 }],
        },
      ])));

    const history = await fetchHistory('T4_BAG', 'americas');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(history.map((entry) => entry.location).sort()).toEqual([
      'Arthurs Rest Smugglers Network',
      'Black Market',
      'Caerleon',
    ]);
  });
});
