import recipes from '../data/recipes.json';
import { getItemName } from './itemCatalog';

export function getRecipe(itemId) {
  return recipes[itemId] || null;
}

export function getNormalQualityAveragePrices(history, days = 28, now = Date.now()) {
  const cutoff = now - Number(days) * 24 * 60 * 60 * 1000;
  const totals = new Map();

  for (const entry of history) {
    if (Number(entry.quality) !== 1 || !entry.item_id) continue;
    const total = totals.get(entry.item_id) || { count: 0, value: 0 };
    for (const point of entry.data || []) {
      if (new Date(point.timestamp).getTime() < cutoff) continue;
      const count = Number(point.item_count) || 0;
      total.count += count;
      total.value += count * (Number(point.avg_price) || 0);
    }
    totals.set(entry.item_id, total);
  }

  return new Map([...totals].map(([itemId, total]) => [
    itemId,
    total.count > 0 ? total.value / total.count : null,
  ]));
}

export function getCraftedItemAveragePrice(
  history,
  {
    averageQualities = false,
    days = 28,
    now = Date.now(),
    quality = 1,
  } = {},
) {
  const cutoff = now - Number(days) * 24 * 60 * 60 * 1000;
  let count = 0;
  let value = 0;

  for (const entry of history) {
    if (!averageQualities && Number(entry.quality) !== Number(quality)) continue;
    for (const point of entry.data || []) {
      if (new Date(point.timestamp).getTime() < cutoff) continue;
      const itemCount = Number(point.item_count) || 0;
      count += itemCount;
      value += itemCount * (Number(point.avg_price) || 0);
    }
  }

  return count > 0 ? value / count : null;
}

export function calculateBreakEvenRrr({ recipe, prices, outputPrice }) {
  if (!recipe) return null;

  const resources = recipe.resources.map((resource) => ({
    ...resource,
    name: getItemName(resource.itemId),
    price: prices.get(resource.itemId) ?? null,
  }));
  const missingResources = resources.filter((resource) => resource.price == null);
  if (outputPrice == null || missingResources.length > 0) {
    return { resources, missingResources, outputPrice, complete: false };
  }

  const materialCost = resources.reduce((total, resource) => total + resource.price * resource.count, 0);
  const returnableValue = resources.reduce((total, resource) => total + resource.price * resource.returnableCount, 0);
  const outputValue = outputPrice * recipe.amountCrafted;
  const totalCost = materialCost + recipe.silver;
  const rawBreakEvenRrr = returnableValue > 0 ? ((totalCost - outputValue) / returnableValue) * 100 : Infinity;
  const breakEvenRrr = Math.max(0, rawBreakEvenRrr);
  const appliedRrr = Math.min(100, breakEvenRrr);
  const effectiveCost = totalCost - (returnableValue * appliedRrr / 100);

  return {
    appliedRrr,
    breakEvenRrr,
    complete: true,
    effectiveCost,
    materialCost,
    outputPrice,
    outputValue,
    profit: outputValue - effectiveCost,
    rawBreakEvenRrr,
    recipe,
    resources,
    returnableValue,
    totalCost,
  };
}
