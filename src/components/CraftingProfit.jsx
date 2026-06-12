import { useEffect, useMemo, useState } from 'react';
import { fetchMultiHistory } from '../services/albionApi';
import {
  calculateBreakEvenRrr,
  getCraftedItemAveragePrice,
  getNormalQualityAveragePrices,
  getRecipe,
} from '../utils/craftingProfit';

export default function CraftingProfit({ averageQualities, days, history, itemId, quality, region }) {
  const recipe = getRecipe(itemId);
  const [resourceHistory, setResourceHistory] = useState([]);
  const [status, setStatus] = useState(recipe ? 'loading' : 'no-recipe');

  useEffect(() => {
    if (!recipe) return undefined;
    const controller = new AbortController();
    setStatus('loading');
    fetchMultiHistory(
      recipe.resources.map((resource) => resource.itemId),
      region,
      [],
      controller.signal,
    ).then((data) => {
      setResourceHistory(data);
      setStatus('ready');
    }).catch((error) => {
      if (error.name !== 'AbortError') setStatus('error');
    });
    return () => controller.abort();
  }, [itemId, region]);

  const prices = useMemo(
    () => getNormalQualityAveragePrices(resourceHistory, days),
    [resourceHistory, days],
  );
  const outputPrice = getCraftedItemAveragePrice(history, {
    averageQualities,
    days,
    quality,
  });
  const result = calculateBreakEvenRrr({ recipe, prices, outputPrice });

  if (status === 'no-recipe') return null;

  const label = status === 'loading' ? 'Min. RRR: ...' : status === 'error' || !result?.complete
    ? 'Min. RRR: N/A'
    : result.breakEvenRrr > 100 ? 'Min. RRR: N/A' : `Min. RRR: ${result.breakEvenRrr.toFixed(1)}%`;

  return (
    <span className="crafting-profit">
      <span className="crafting-profit-indicator has-tooltip" data-tooltip="The minimum resource return rate needed for average crafted value to cover the full material cost.">
        {label}
      </span>
    </span>
  );
}
