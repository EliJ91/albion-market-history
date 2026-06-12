import { describe, expect, it } from 'vitest';
import {
  calculateBreakEvenRrr,
  getCraftedItemAveragePrice,
  getNormalQualityAveragePrices,
  getRecipe,
} from './craftingProfit';

describe('crafting profitability', () => {
  it('loads standard and artifact recipes with returnable flags', () => {
    expect(getRecipe('T4_MAIN_SWORD').resources).toEqual([
      { itemId: 'T4_METALBAR', count: 16, returnableCount: 16 },
      { itemId: 'T4_LEATHER', count: 8, returnableCount: 8 },
    ]);
    expect(getRecipe('T4_2H_CLAYMORE_AVALON').resources.at(-1).returnableCount).toBe(0);
  });

  it('calculates normal-quality volume-weighted ingredient averages', () => {
    const prices = getNormalQualityAveragePrices([{
      item_id: 'T4_METALBAR',
      quality: 1,
      data: [
        { timestamp: '2026-06-08T00:00:00', avg_price: 100, item_count: 1 },
        { timestamp: '2026-06-09T00:00:00', avg_price: 200, item_count: 3 },
      ],
    }], 7, new Date('2026-06-09T12:00:00').getTime());

    expect(prices.get('T4_METALBAR')).toBe(175);
  });

  it('finds the minimum RRR while keeping artifacts fully consumed', () => {
    const result = calculateBreakEvenRrr({
      outputPrice: 140,
      prices: new Map([['RETURNABLE', 100], ['ARTIFACT', 50]]),
      recipe: {
        amountCrafted: 1,
        silver: 0,
        resources: [
          { itemId: 'RETURNABLE', count: 1, returnableCount: 1 },
          { itemId: 'ARTIFACT', count: 1, returnableCount: 0 },
        ],
      },
    });

    expect(result.totalCost).toBe(150);
    expect(result.returnableValue).toBe(100);
    expect(result.breakEvenRrr).toBeCloseTo(10);
    expect(result.effectiveCost).toBeCloseTo(140);
    expect(result.profit).toBeCloseTo(0);
  });

  it('uses all item qualities when averages are enabled', () => {
    const history = [
      {
        quality: 1,
        data: [{ timestamp: '2026-06-09T00:00:00', avg_price: 100, item_count: 1 }],
      },
      {
        quality: 5,
        data: [{ timestamp: '2026-06-09T00:00:00', avg_price: 500, item_count: 3 }],
      },
    ];
    const now = new Date('2026-06-09T12:00:00').getTime();

    expect(getCraftedItemAveragePrice(history, { quality: 1, now })).toBe(100);
    expect(getCraftedItemAveragePrice(history, { averageQualities: true, now })).toBe(400);
  });
});
