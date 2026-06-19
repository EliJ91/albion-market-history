import { useEffect, useMemo, useState } from 'react';
import { fetchMultiHistory } from '../services/albionApi';
import {
  calculateBreakEvenRrr,
  getCraftedItemAveragePrice,
  getNormalQualityAveragePrices,
  getRecipe,
} from '../utils/craftingProfit';

export default function CraftingProfit({
  averageQualities,
  days,
  history,
  ignoredPointKeys = new Set(),
  itemId,
  locations = [],
  quality,
  region,
}) {
  const recipe = getRecipe(itemId);
  const [resourceHistory, setResourceHistory] = useState([]);
  const [status, setStatus] = useState(recipe ? 'loading' : 'no-recipe');

  useEffect(() => {
    if (!recipe || history.length === 0 || locations.length === 0) return undefined;
    const controller = new AbortController();
    setStatus('loading');
    fetchMultiHistory(
      recipe.resources.map((resource) => resource.itemId),
      region,
      locations,
      controller.signal,
    ).then((data) => {
      setResourceHistory(data);
      setStatus('ready');
    }).catch((error) => {
      if (error.name !== 'AbortError') setStatus('error');
    });
    return () => controller.abort();
  }, [itemId, region, history.length, locations.join('|')]);

  const prices = useMemo(
    () => getNormalQualityAveragePrices(resourceHistory, days, Date.now(), locations),
    [resourceHistory, days, locations.join('|')],
  );
  const outputPrice = getCraftedItemAveragePrice(history, {
    averageQualities,
    days,
    ignoredPointKeys,
    locations,
    quality,
  });
  const result = calculateBreakEvenRrr({ recipe, prices, outputPrice });

  if (status === 'no-recipe') return null;

  const label = status === 'loading' ? 'Min. RRR: ...' : status === 'error' || !result?.complete
    ? 'Min. RRR: N/A'
    : result.breakEvenRrr > 100 ? 'Min. RRR: N/A' : `Min. RRR: ${result.breakEvenRrr.toFixed(1)}%`;

  return (
    <span className="crafting-profit">
      <span className="crafting-profit-indicator has-tooltip" data-tooltip="Break-even RRR: the return rate needed so this item's average sale price from included chart points covers its ingredient cost in the visible cities.">
        {label}
      </span>
    </span>
  );
}
