import { describe, expect, it } from 'vitest';
import {
  calculateMeldingStrategies,
  getAveragePricesByItem,
  getFragmentId,
  getMeldingPool,
} from './melding';

describe('artifact melding analysis', () => {
  it('builds selected and any-tree pools from the wiki artifact tables', () => {
    expect(getMeldingPool('mage', 'rune', 4)).toHaveLength(9);
    expect(getMeldingPool('hunter', 'rune', 8)).toHaveLength(10);
    expect(getMeldingPool('warrior', 'rune', 8)).toHaveLength(10);
    expect(getMeldingPool('any', 'rune', 8)).toHaveLength(29);
    expect(getFragmentId('relic', 7)).toBe('T7_RELIC');
    expect(getFragmentId('avalonian', 6)).toBe('T6_SHARD_AVALONIAN');
  });

  it('calculates volume-weighted average prices by item', () => {
    const prices = getAveragePricesByItem([
      {
        item_id: 'T4_RUNE',
        quality: 1,
        data: [
          { avg_price: 100, item_count: 1 },
          { avg_price: 200, item_count: 3 },
        ],
      },
    ]);

    expect(prices.get('T4_RUNE')).toBe(175);
  });

  it('compares expected artifact value against fragment cost', () => {
    const pool = getMeldingPool('mage', 'rune', 4);
    const prices = new Map(pool.map((item) => [item.itemId, 1000]));
    const strategies = calculateMeldingStrategies({
      fragmentPrice: 10,
      material: 'rune',
      prices,
      tier: 4,
    });
    const mage = strategies.find((strategy) => strategy.tree === 'mage');

    expect(mage.expectedValue).toBe(1000);
    expect(mage.inputCost).toBe(500);
    expect(mage.profit).toBe(500);
  });
});
