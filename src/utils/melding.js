import meldingPools from '../data/meldingPools.json';
import { getItemName } from './itemCatalog';

export const MELDING_MATERIALS = {
  rune: 'Rune',
  soul: 'Soul',
  relic: 'Relic',
  avalonian: 'Avalonian Shard',
};

export const MELDING_TREES = ['mage', 'hunter', 'warrior'];
export const ANY_TREE_COST = 35;
export const SELECTED_TREE_COST = 50;

export function buildTierItemId(itemId, tier) {
  return itemId.replace(/^T8_/, `T${tier}_`);
}

export function getFragmentId(material, tier) {
  if (material === 'avalonian') return `T${tier}_SHARD_AVALONIAN`;
  return `T${tier}_${material.toUpperCase()}`;
}

export function getMeldingPool(tree, material, tier) {
  const trees = tree === 'any' ? MELDING_TREES : [tree];
  return trees.flatMap((treeName) => (
    meldingPools[treeName]?.[material] || []
  )).map((itemId) => ({
    itemId: buildTierItemId(itemId, tier),
    name: getItemName(buildTierItemId(itemId, tier)),
    tree: treeNameForItem(itemId),
  }));
}

function treeNameForItem(itemId) {
  return MELDING_TREES.find((tree) => Object.values(meldingPools[tree]).flat().includes(itemId)) || '';
}

export function getAveragePricesByItem(history) {
  const totals = new Map();

  for (const entry of history) {
    if (Number(entry.quality) !== 1) continue;
    const current = totals.get(entry.item_id) || { count: 0, value: 0 };
    for (const point of entry.data || []) {
      const count = Number(point.item_count) || 0;
      current.count += count;
      current.value += count * (Number(point.avg_price) || 0);
    }
    totals.set(entry.item_id, current);
  }

  return new Map([...totals].map(([itemId, total]) => [
    itemId,
    total.count > 0 ? total.value / total.count : null,
  ]));
}

export function calculateMeldingStrategies({
  fragmentPrice,
  material,
  prices,
  tier,
}) {
  return ['any', ...MELDING_TREES].map((tree) => {
    const pool = getMeldingPool(tree, material, tier);
    const pricedOutputs = pool.filter((item) => prices.get(item.itemId) != null);
    const expectedValue = pricedOutputs.length
      ? pricedOutputs.reduce((total, item) => total + prices.get(item.itemId), 0) / pricedOutputs.length
      : 0;
    const fragmentsUsed = tree === 'any' ? ANY_TREE_COST : SELECTED_TREE_COST;
    const inputCost = (fragmentPrice || 0) * fragmentsUsed;
    const profit = expectedValue - inputCost;

    return {
      tree,
      pool,
      pricedOutputs,
      expectedValue,
      fragmentsUsed,
      inputCost,
      profit,
      roi: inputCost > 0 ? (profit / inputCost) * 100 : 0,
    };
  });
}
