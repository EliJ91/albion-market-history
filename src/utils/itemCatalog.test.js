import { describe, expect, it } from 'vitest';
import {
  buildItemId,
  getAvailableTiers,
  getEnchantment,
  getEquivalentItem,
  getItemName,
  getItemValue,
  getTier,
  parseSearchQuery,
  searchItems,
} from './itemCatalog';

describe('item catalog', () => {
  it('returns the static item value for an enchanted equipment item', () => {
    expect(getItemValue('T7_2H_HOLYSTAFF_HELL@3')).toBe(35840);
  });

  it('finds items without returning an unbounded suggestion list', () => {
    const results = searchItems('broadsword');

    expect(results).toHaveLength(8);
    expect(results[0].name).toContain('Broadsword');
    expect(searchItems('a')).toEqual([]);
  });

  it('finds the Exalted Staff family from the current item catalog', () => {
    expect(searchItems('exalted staff', 10).map((item) => item.itemId)).toEqual([
      'T4_2H_HOLYSTAFF_CRYSTAL',
      'T5_2H_HOLYSTAFF_CRYSTAL',
      'T6_2H_HOLYSTAFF_CRYSTAL',
      'T7_2H_HOLYSTAFF_CRYSTAL',
      'T8_2H_HOLYSTAFF_CRYSTAL',
    ]);
    expect(searchItems('6.3 exalted staff')[0]).toMatchObject({
      itemId: 'T6_2H_HOLYSTAFF_CRYSTAL@3',
      name: "Master's Exalted Staff",
    });
  });

  it('constructs equipment enchantment IDs', () => {
    expect(buildItemId('T4_MAIN_SWORD', 6, 3)).toBe('T6_MAIN_SWORD@3');
  });

  it('constructs raw-resource enchantment IDs', () => {
    expect(buildItemId('T4_ORE', 5, 2)).toBe('T5_ORE_LEVEL2@2');
    expect(buildItemId('T4_ORE_LEVEL1@1', 4, 0)).toBe('T4_ORE');
  });

  it('reads item metadata and resolves a tier-adjusted display name', () => {
    expect(getTier('T7_MAIN_SWORD@2')).toBe(7);
    expect(getEnchantment('T7_MAIN_SWORD@2')).toBe(2);
    expect(getItemName('T5_MAIN_SWORD@1')).toBe("Expert's Broadsword");
    expect(getAvailableTiers('T4_MAIN_SWORD')).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(getAvailableTiers('T4_ORE')).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('finds the equivalent catalog item when a tier changes', () => {
    expect(getEquivalentItem('T4_MAIN_SWORD', 6)).toMatchObject({
      name: "Master's Broadsword",
      itemId: 'T6_MAIN_SWORD',
    });
    expect(getEquivalentItem('T4_ORE', 5)).toMatchObject({
      name: 'Titanium Ore',
      itemId: 'T5_ORE',
    });
    expect(getEquivalentItem('T4_ORE_LEVEL1@1', 5)).toMatchObject({
      name: 'Uncommon Titanium Ore',
      itemId: 'T5_ORE_LEVEL1@1',
    });
  });

  it('parses tier and enchantment notation before or after the item query', () => {
    expect(parseSearchQuery('5.3 blazing')).toEqual({
      enchantment: 3,
      query: 'blazing',
      tier: 5,
    });
    expect(parseSearchQuery('blazing staff 5.3')).toEqual({
      enchantment: 3,
      query: 'blazing staff',
      tier: 5,
    });
  });

  it('returns unique matches at the tier and enchantment included in the search', () => {
    const blazing = searchItems('5.3 blazing');
    const staffs = searchItems('staff 5.3', 100);

    expect(blazing[0]).toMatchObject({
      itemId: 'T5_2H_INFERNOSTAFF_MORGANA@3',
      name: "Expert's Blazing Staff",
    });
    expect(staffs.length).toBeGreaterThan(1);
    expect(new Set(staffs.map((item) => item.itemId)).size).toBe(staffs.length);
    expect(staffs.every((item) => getTier(item.itemId) === 5 && getEnchantment(item.itemId) === 3)).toBe(true);
  });
});
