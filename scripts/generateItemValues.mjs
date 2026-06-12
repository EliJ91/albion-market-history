import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve('src/data/itemValues.json');

const sourceText = sourcePath
  ? fs.readFileSync(sourcePath, 'utf8')
  : await fetch(SOURCE_URL).then((response) => {
    if (!response.ok) throw new Error(`Unable to download ${SOURCE_URL}: ${response.status}`);
    return response.text();
  });
const rawItems = JSON.parse(sourceText).items;
const itemDatabase = JSON.parse(fs.readFileSync(path.resolve('src/data/itemDatabase.json'), 'utf8'));
const definitions = new Map();

function definitionScore(value) {
  if (value['@itemvalue'] != null) return 1_000_000 + Object.keys(value).length;
  if (value.craftingrequirements || value.enchantments) return 100_000 + Object.keys(value).length;
  return Object.keys(value).length;
}

function indexDefinitions(value) {
  if (!value || typeof value !== 'object') return;

  const itemId = value['@uniquename'];
  if (itemId) {
    const current = definitions.get(itemId);
    if (!current || definitionScore(value) > definitionScore(current)) {
      definitions.set(itemId, value);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('@')) continue;
    if (Array.isArray(child)) child.forEach(indexDefinitions);
    else indexDefinitions(child);
  }
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function splitItemId(itemId) {
  const match = itemId.match(/^(.*)@(\d+)$/);
  return match
    ? { definitionId: match[1], enchantment: Number(match[2]) }
    : { definitionId: itemId, enchantment: 0 };
}

function getCraftingRequirements(definition, enchantment) {
  if (enchantment === 0) return definition.craftingrequirements;

  const enchantments = asArray(definition.enchantments?.enchantment);
  return enchantments.find((entry) => Number(entry['@enchantmentlevel']) === enchantment)?.craftingrequirements;
}

const memo = new Map();
const resolving = new Set();

function resolveItemValue(itemId) {
  if (memo.has(itemId)) return memo.get(itemId);
  if (resolving.has(itemId)) return null;
  resolving.add(itemId);

  const { definitionId, enchantment } = splitItemId(itemId);
  const definition = definitions.get(definitionId);
  let itemValue = null;

  if (definition?.['@itemvalue'] != null) {
    itemValue = Number(definition['@itemvalue']);
  } else if (definition) {
    const recipe = asArray(getCraftingRequirements(definition, enchantment))[0];
    const resources = asArray(recipe?.craftresource);

    if (resources.length > 0) {
      let total = 0;
      for (const resource of resources) {
        const resourceId = resource['@uniquename'];
        const resourceEnchantment = Number(resource['@enchantmentlevel']) || 0;
        const resourceLookupId = resourceEnchantment > 0 && !resourceId.includes('@') && !resourceId.includes('_LEVEL')
          ? `${resourceId}@${resourceEnchantment}`
          : resourceId;
        const resourceValue = resolveItemValue(resourceLookupId);
        if (!resourceId || (resourceValue == null && !definitions.has(resourceId))) {
          total = null;
          break;
        }
        total += (resourceValue || 0) * Number(resource['@count'] || 0);
      }
      itemValue = total;
    }
  }

  resolving.delete(itemId);
  memo.set(itemId, Number.isFinite(itemValue) ? itemValue : null);
  return memo.get(itemId);
}

indexDefinitions(rawItems);

const values = {};
for (const baseItemId of new Set(Object.values(itemDatabase))) {
  const baseValue = resolveItemValue(baseItemId);
  if (baseValue != null) values[baseItemId] = baseValue;

  for (let enchantment = 1; enchantment <= 4; enchantment += 1) {
    const resourceId = `${baseItemId}_LEVEL${enchantment}@${enchantment}`;
    const resourceValue = resolveItemValue(resourceId);
    if (resourceValue != null) values[resourceId] = resourceValue;

    const enchantedId = `${baseItemId}@${enchantment}`;
    const enchantedValue = resolveItemValue(enchantedId);
    if (enchantedValue != null) values[enchantedId] = enchantedValue;
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(values, null, 2)}\n`);
console.log(`Generated ${Object.keys(values).length} item values at ${outputPath}`);
