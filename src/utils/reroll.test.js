import { describe, expect, it } from 'vitest';
import {
  getQualityPriceAverages,
  getRerollAnalysis,
  getRerollPlan,
} from './reroll';

const now = new Date('2026-06-08T00:00:00Z').getTime();
const history = [
  {
    location: 'Caerleon',
    quality: 1,
    data: [{ timestamp: '2026-06-07T00:00:00Z', avg_price: 100, item_count: 10 }],
  },
  {
    location: 'Caerleon',
    quality: 2,
    data: [{ timestamp: '2026-06-07T00:00:00Z', avg_price: 3000, item_count: 10 }],
  },
  {
    location: 'Bridgewatch',
    quality: 1,
    data: [{ timestamp: '2026-06-07T00:00:00Z', avg_price: 100, item_count: 10 }],
  },
  {
    location: 'Bridgewatch',
    quality: 2,
    data: [{ timestamp: '2026-06-07T00:00:00Z', avg_price: 1000, item_count: 10 }],
  },
];

describe('reroll analysis', () => {
  it('calculates Normal to Good as one guaranteed reroll using the displayed rounded chances', () => {
    expect(getRerollPlan({
      itemValue: 512,
      qualityAverages: { 1: 100, 2: 3000 },
      sourceQuality: 1,
      targetQuality: 2,
    })).toMatchObject({
      expectedCost: 2252.8,
      expectedNet: 647.2,
      expectedRolls: 1,
      firstRollChance: 1,
      worthIt: true,
    });
  });

  it('accounts for failures and intermediate upgrades from Good to Excellent', () => {
    const plan = getRerollPlan({
      itemValue: 512,
      qualityAverages: { 2: 10000, 4: 25000 },
      sourceQuality: 2,
      targetQuality: 4,
    });

    expect(plan).toMatchObject({
      expectedCost: 9815.8,
      expectedNet: 5184.2,
      expectedRolls: 3.14,
      firstRollChance: 0.1,
      usesTargetPriceEstimate: true,
      worthIt: true,
    });
    expect(plan.terminalChances[4]).toBeCloseTo(0.996857);
    expect(plan.terminalChances[5]).toBeCloseTo(0.003143);
  });

  it('uses the average price of an outcome that jumps above the target', () => {
    expect(getRerollPlan({
      itemValue: 512,
      qualityAverages: { 2: 10000, 4: 25000, 5: 4000000 },
      sourceQuality: 2,
      targetQuality: 4,
    })).toMatchObject({
      expectedTerminalAverage: 37492.9,
      expectedNet: 17677.1,
      usesTargetPriceEstimate: false,
      worthIt: true,
    });
  });

  it('creates every possible source-to-higher-target plan', () => {
    const analysis = getRerollAnalysis({
      itemValue: 512,
      qualityAverages: {},
    });

    expect(analysis.plans).toHaveLength(10);
    expect(analysis.plans.at(-1)).toMatchObject({
      sourceQuality: 4,
      targetQuality: 5,
      expectedCost: 2816000,
      expectedRolls: 200,
      firstRollChance: 0.005,
    });
  });

  it('changes the recommendation when a city is disabled', () => {
    const allCities = getQualityPriceAverages(history, {
      days: 7,
      locations: ['Caerleon', 'Bridgewatch'],
      now,
    });
    const caerleonOnly = getQualityPriceAverages(history, {
      days: 7,
      locations: ['Caerleon'],
      now,
    });

    expect(getRerollPlan({
      itemValue: 512,
      qualityAverages: allCities,
      sourceQuality: 1,
      targetQuality: 2,
    }).worthIt).toBe(false);
    expect(getRerollPlan({
      itemValue: 512,
      qualityAverages: caerleonOnly,
      sourceQuality: 1,
      targetQuality: 2,
    }).worthIt).toBe(true);
  });
});
