import recipes from '../data/recipes.json';
import {
  buildItemId,
  getEnchantment,
  getItemName,
  getTier,
  ITEM_CATALOG,
  normalizeSearch,
  searchItems,
} from './itemCatalog';
import { calculateRequiredMaterials } from './craftingProfit';

const ARTIFACT_PATTERN = /_ARTEFACT_/;

function parseQuantity(value) {
  return Math.max(0, Number(String(value).replace(/,/g, '')) || 0);
}

function singularizeQuery(value) {
  return value
    .split(/\s+/)
    .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))
    .join(' ');
}

function extractQuantity(line) {
  const trimmed = line.trim();
  const leading = trimmed.match(/^(\d[\d,]*)\s*x?\s+(.+)$/i);
  if (leading) return { quantity: parseQuantity(leading[1]), text: leading[2].trim() };

  const trailing = trimmed.match(/^(.+?)\s+(?:x\s*)?(\d[\d,]*)$/i);
  if (trailing) return { quantity: parseQuantity(trailing[2]), text: trailing[1].trim() };

  const separated = trimmed.match(/^(.+?)\s*[:,-]\s*(\d[\d,]*)$/i);
  if (separated) return { quantity: parseQuantity(separated[2]), text: separated[1].trim() };

  return { quantity: 1, text: trimmed };
}

function findCatalogItem(text) {
  const normalizedText = normalizeSearch(text);
  if (!normalizedText) return null;

  const exact = ITEM_CATALOG.find((item) => (
    item.normalizedName === normalizedText || item.normalizedId === normalizedText
  ));
  if (exact) return exact;

  const notation = text.match(/\b(?:t|tier\s*)?([1-8])(?:\.([0-4]))?\b/i);
  if (notation) {
    const tier = Number(notation[1]);
    const enchantment = notation[2] == null ? null : Number(notation[2]);
    const query = singularizeQuery(text.replace(notation[0], ' ').trim());
    const match = searchItems(query, 60).find((item) => (
      getTier(item.itemId) === tier
      && (enchantment == null || getEnchantment(item.itemId) === enchantment || isArtifact(item.itemId))
    ));
    if (match) return match;
  }

  const searched = searchItems(singularizeQuery(text), 1)[0];
  if (searched) return searched;

  return [...ITEM_CATALOG]
    .sort((left, right) => right.name.length - left.name.length)
    .find((item) => normalizedText.includes(item.normalizedName) || normalizedText.includes(item.normalizedId)) || null;
}

export function parseChestLog(log) {
  const recognized = [];
  const unrecognized = [];
  const inventory = new Map();

  for (const rawLine of String(log || '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue;

    const parsed = extractQuantity(rawLine);
    const item = findCatalogItem(parsed.text);
    if (!item) {
      unrecognized.push(rawLine.trim());
      continue;
    }

    const quantity = Math.max(1, parsed.quantity);
    const existing = inventory.get(item.itemId) || {
      itemId: item.itemId,
      name: getItemName(item.itemId, item.name),
      quantity: 0,
    };

    existing.quantity += quantity;
    inventory.set(item.itemId, existing);
    recognized.push({
      itemId: item.itemId,
      name: existing.name,
      quantity,
      rawLine: rawLine.trim(),
    });
  }

  return {
    inventory,
    recognized,
    unrecognized,
  };
}

function getRecipeArtifact(recipe) {
  return recipe.resources.find((resource) => ARTIFACT_PATTERN.test(resource.itemId)) || null;
}

function isArtifact(itemId) {
  return ARTIFACT_PATTERN.test(itemId);
}

export function buildShoppingList({ enchantment = 0, inventory, rrr = 0, tier = 4 }) {
  const selectedTier = Number(tier) || 4;
  const selectedEnchantment = Number(enchantment) || 0;
  const inventoryMap = inventory instanceof Map ? inventory : new Map();
  const craftPlans = [];
  const totalRequired = new Map();
  const artifactInventory = [...inventoryMap.values()].filter((entry) => (
    isArtifact(entry.itemId) && getTier(entry.itemId) === selectedTier && entry.quantity > 0
  ));

  for (const artifact of artifactInventory) {
    const recipeId = buildItemId(artifact.itemId.replace(`T${selectedTier}_ARTEFACT_`, `T${selectedTier}_`), selectedTier, selectedEnchantment);
    const recipe = recipes[recipeId];
    const artifactResource = recipe ? getRecipeArtifact(recipe) : null;

    if (!recipe || !artifactResource || artifactResource.itemId !== artifact.itemId) {
      craftPlans.push({
        artifact,
        craftableAmount: 0,
        itemId: recipeId,
        missingRecipe: true,
        name: getItemName(recipeId, recipeId),
      });
      continue;
    }

    const craftsFromArtifacts = Math.floor(artifact.quantity / artifactResource.count);
    if (craftsFromArtifacts <= 0) continue;

    const craftableAmount = craftsFromArtifacts * recipe.amountCrafted;
    const result = calculateRequiredMaterials({ amount: craftableAmount, recipe, rrr });

    for (const resource of result.resources) {
      const current = totalRequired.get(resource.itemId) || {
        itemId: resource.itemId,
        name: resource.name,
        required: 0,
      };
      current.required += resource.required;
      totalRequired.set(resource.itemId, current);
    }

    craftPlans.push({
      artifact,
      craftableAmount: result.amountProduced,
      itemId: recipeId,
      name: getItemName(recipeId, recipeId),
      result,
    });
  }

  const buyList = [...totalRequired.values()]
    .map((entry) => {
      const owned = inventoryMap.get(entry.itemId)?.quantity || 0;
      return {
        ...entry,
        buy: Math.max(0, entry.required - owned),
        owned,
      };
    })
    .filter((entry) => entry.buy > 0)
    .sort((left, right) => {
      if (isArtifact(left.itemId) !== isArtifact(right.itemId)) return isArtifact(left.itemId) ? 1 : -1;
      return left.name.localeCompare(right.name);
    });

  return {
    artifactCount: artifactInventory.reduce((total, artifact) => total + artifact.quantity, 0),
    buyList,
    craftPlans,
    totalRequired: [...totalRequired.values()],
  };
}
