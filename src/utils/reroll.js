import { QUALITY_LABELS } from '../config';

export const REROLL_MODIFIERS = {
  1: 4.4,
  2: 5.5,
  3: 6.6,
  4: 27.5,
};

// Probabilities shown by Albion's reroll UI. Normal's displayed values total
// 100.1% because of rounding, so transitions are normalized before use.
export const REROLL_UPGRADE_CHANCES = {
  1: { 2: 0.8, 3: 0.15, 4: 0.05, 5: 0.001 },
  2: { 3: 0.6, 4: 0.099, 5: 0.001 },
  3: { 4: 0.499, 5: 0.001 },
  4: { 5: 0.005 },
};

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getTransitions(sourceQuality) {
  const transitions = Object.entries(REROLL_UPGRADE_CHANCES[sourceQuality] || {})
    .map(([quality, chance]) => ({ quality: Number(quality), chance }));
  const upgradeChance = transitions.reduce((total, transition) => total + transition.chance, 0);
  const scale = upgradeChance > 1 ? 1 / upgradeChance : 1;

  return {
    stayChance: Math.max(0, 1 - upgradeChance * scale),
    transitions: transitions.map((transition) => ({
      ...transition,
      chance: transition.chance * scale,
    })),
  };
}

export function getQualityPriceAverages(
  history,
  {
    locations = [],
    days = 28,
    now = Date.now(),
  } = {},
) {
  const selectedLocations = new Set(locations);
  const cutoff = now - Number(days) * 24 * 60 * 60 * 1000;
  const totals = new Map();

  for (const entry of history) {
    if (selectedLocations.size > 0 && !selectedLocations.has(entry.location)) continue;

    const quality = Number(entry.quality);
    if (!QUALITY_LABELS[quality]) continue;

    const total = totals.get(quality) || { itemCount: 0, weightedPrice: 0 };
    for (const point of entry.data || []) {
      if (new Date(point.timestamp).getTime() < cutoff) continue;
      const itemCount = Number(point.item_count) || 0;
      const averagePrice = Number(point.avg_price) || 0;
      total.itemCount += itemCount;
      total.weightedPrice += averagePrice * itemCount;
    }
    totals.set(quality, total);
  }

  return Object.fromEntries(
    [...totals.entries()]
      .filter(([, total]) => total.itemCount > 0)
      .map(([quality, total]) => [quality, Math.round(total.weightedPrice / total.itemCount)]),
  );
}

export function getRerollPlan({
  itemValue,
  qualityAverages,
  sourceQuality,
  targetQuality,
}) {
  const source = Number(sourceQuality);
  const target = Number(targetQuality);
  const sourceAverage = qualityAverages[source] ?? null;
  const targetAverage = qualityAverages[target] ?? null;

  if (!itemValue || source < 1 || source >= target || target > 5) return null;

  const expectedByQuality = {};

  for (let quality = target - 1; quality >= source; quality -= 1) {
    const { stayChance, transitions } = getTransitions(quality);
    const leaveChance = 1 - stayChance;
    const rerollCost = itemValue * REROLL_MODIFIERS[quality];
    let futureCost = 0;
    let futureRolls = 0;
    const terminalChances = {};

    for (const transition of transitions) {
      if (transition.quality >= target) {
        terminalChances[transition.quality] = (terminalChances[transition.quality] || 0) + transition.chance;
      } else {
        const future = expectedByQuality[transition.quality];
        futureCost += transition.chance * future.cost;
        futureRolls += transition.chance * future.rolls;
        for (const [terminalQuality, chance] of Object.entries(future.terminalChances)) {
          terminalChances[terminalQuality] = (terminalChances[terminalQuality] || 0) + transition.chance * chance;
        }
      }
    }

    expectedByQuality[quality] = {
      cost: (rerollCost + futureCost) / leaveChance,
      rolls: (1 + futureRolls) / leaveChance,
      terminalChances: Object.fromEntries(
        Object.entries(terminalChances).map(([terminalQuality, chance]) => [
          terminalQuality,
          chance / leaveChance,
        ]),
      ),
    };
  }

  const firstRollChance = getTransitions(source).transitions
    .filter((transition) => transition.quality >= target)
    .reduce((total, transition) => total + transition.chance, 0);
  const expectedCost = expectedByQuality[source].cost;
  const expectedRolls = expectedByQuality[source].rolls;
  const terminalChances = expectedByQuality[source].terminalChances;
  const hasAllTerminalPrices = Object.keys(terminalChances)
    .every((quality) => qualityAverages[quality] != null);
  const expectedTerminalAverage = hasAllTerminalPrices
    ? Object.entries(terminalChances).reduce(
      (total, [quality, chance]) => total + qualityAverages[quality] * chance,
      0,
    )
    : null;
  const valuationAverage = expectedTerminalAverage ?? targetAverage;
  const priceGain = sourceAverage != null && valuationAverage != null
    ? valuationAverage - sourceAverage
    : null;
  const expectedNet = priceGain != null ? priceGain - expectedCost : null;

  return {
    expectedCost: round(expectedCost),
    expectedNet: expectedNet == null ? null : round(expectedNet),
    expectedRolls: round(expectedRolls, 2),
    expectedTerminalAverage: expectedTerminalAverage == null ? null : round(expectedTerminalAverage),
    firstRollChance: Math.min(1, firstRollChance),
    priceGain,
    sourceAverage,
    sourceQuality: source,
    targetAverage,
    targetQuality: target,
    terminalChances,
    usesTargetPriceEstimate: expectedTerminalAverage == null,
    worthIt: expectedNet == null ? null : expectedNet > 0,
  };
}

export function getRerollAnalysis({
  itemValue,
  qualityAverages,
}) {
  const plans = [];

  for (let sourceQuality = 1; sourceQuality < 5; sourceQuality += 1) {
    for (let targetQuality = sourceQuality + 1; targetQuality <= 5; targetQuality += 1) {
      plans.push(getRerollPlan({
        itemValue,
        qualityAverages,
        sourceQuality,
        targetQuality,
      }));
    }
  }

  return {
    itemValue: itemValue ?? null,
    plans: plans.filter(Boolean),
  };
}
