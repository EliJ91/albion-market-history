import { describe, expect, it } from 'vitest';
import { buildShoppingList, parseChestLog } from './shoppingList';

describe('shopping list utilities', () => {
  it('parses chest logs and subtracts owned materials from artifact crafts', () => {
    const parsed = parseChestLog(`
      8 Master's Burning Orb
      Exceptional Bloodoak Planks 10
      5 Exceptional Runite Steel Bar
    `);

    expect(parsed.unrecognized).toEqual([]);
    expect(parsed.inventory.get('T6_ARTEFACT_2H_FIRESTAFF_HELL').quantity).toBe(8);
    expect(parsed.inventory.get('T6_PLANKS_LEVEL3@3').quantity).toBe(10);

    const shoppingList = buildShoppingList({
      enchantment: 3,
      inventory: parsed.inventory,
      rrr: 25,
      tier: 6,
    });

    expect(shoppingList.craftPlans[0]).toMatchObject({
      craftableAmount: 8,
      itemId: 'T6_2H_FIRESTAFF_HELL@3',
    });
    expect(shoppingList.buyList).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'T6_PLANKS_LEVEL3@3', buy: 115, owned: 10, required: 125 }),
      expect.objectContaining({ itemId: 'T6_METALBAR_LEVEL3@3', buy: 70, owned: 5, required: 75 }),
    ]));
    expect(shoppingList.buyList.some((item) => item.itemId === 'T6_ARTEFACT_2H_FIRESTAFF_HELL')).toBe(false);
  });

  it('recognizes tier notation in pasted lines', () => {
    const parsed = parseChestLog('8 6.3 burning orbs');

    expect(parsed.unrecognized).toEqual([]);
    expect(parsed.inventory.get('T6_ARTEFACT_2H_FIRESTAFF_HELL').quantity).toBe(8);
  });
});
