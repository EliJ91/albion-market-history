import { describe, expect, it } from 'vitest';
import { calculateResourceReturnRate, calculateScenario, getBaseProductionBonus } from './resourceReturn';

describe('resource return calculations', () => {
  it('converts production bonus to RRR using the Albion formula', () => {
    expect(calculateResourceReturnRate(18)).toBeCloseTo(15.254, 2);
    expect(calculateResourceReturnRate(77)).toBeCloseTo(43.503, 2);
  });

  it('uses hideout zone quality and power level bonuses', () => {
    expect(getBaseProductionBonus({ location: 'hideoutGeneral', powerLevel: 9 })).toBe(26);
    expect(getBaseProductionBonus({ location: 'hideoutSpecialized', zoneQuality: 1, powerLevel: 9 })).toBe(57);
    expect(getBaseProductionBonus({ location: 'hideoutSpecialized', zoneQuality: 6, powerLevel: 9 })).toBe(82);
  });

  it('adds focus, daily, and other bonuses before calculating RRR', () => {
    const result = calculateScenario({
      location: 'royalCity',
      focus: true,
      dailyBonus: 10,
      extraBonus: 5,
    });

    expect(result.totalBonus).toBe(92);
    expect(result.rrr).toBeCloseTo(47.916, 2);
  });
});
