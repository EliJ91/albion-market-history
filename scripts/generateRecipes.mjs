import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve('src/data/recipes.json');
const sourceText = sourcePath
  ? fs.readFileSync(sourcePath, 'utf8')
  : await fetch(SOURCE_URL).then((response) => {
    if (!response.ok) throw new Error(`Unable to download ${SOURCE_URL}: ${response.status}`);
    return response.text();
  });
const rawItems = JSON.parse(sourceText).items;
const itemDatabase = JSON.parse(fs.readFileSync(path.resolve('src/data/itemDatabase.json'), 'utf8'));
const definitions = new Map();

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function definitionScore(value) {
  if (value.craftingrequirements || value.enchantments) return 100_000 + Object.keys(value).length;
  return Object.keys(value).length;
}

function indexDefinitions(value) {
  if (!value || typeof value !== 'object') return;
  const itemId = value['@uniquename'];
  if (itemId) {
    const current = definitions.get(itemId);
    if (!current || definitionScore(value) > definitionScore(current)) definitions.set(itemId, value);
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('@')) continue;
    asArray(child).forEach(indexDefinitions);
  }
}

function marketItemId(resource) {
  const itemId = resource['@uniquename'];
  const enchantment = Number(resource['@enchantmentlevel']) || 0;
  if (!enchantment || itemId.includes('@')) return itemId;
  return itemId.includes(`_LEVEL${enchantment}`) ? `${itemId}@${enchantment}` : `${itemId}@${enchantment}`;
}

function getRequirements(definition, enchantment) {
  if (enchantment === 0) return definition.craftingrequirements;
  return asArray(definition.enchantments?.enchantment)
    .find((entry) => Number(entry['@enchantmentlevel']) === enchantment)?.craftingrequirements;
}

function makeRecipe(requirements) {
  const recipe = asArray(requirements)[0];
  const resources = asArray(recipe?.craftresource);
  if (!recipe || resources.length === 0) return null;

  return {
    amountCrafted: Number(recipe['@amountcrafted']) || 1,
    silver: Number(recipe['@silver']) || 0,
    resources: resources.map((resource) => {
      const count = Number(resource['@count']) || 0;
      const maxReturn = resource['@maxreturnamount'];
      return {
        itemId: marketItemId(resource),
        count,
        returnableCount: maxReturn == null ? count : Math.min(count, Number(maxReturn) || 0),
      };
    }),
  };
}

indexDefinitions(rawItems);

const recipes = {};
for (const baseItemId of new Set(Object.values(itemDatabase))) {
  const definition = definitions.get(baseItemId);
  if (!definition) continue;

  for (let enchantment = 0; enchantment <= 4; enchantment += 1) {
    const recipe = makeRecipe(getRequirements(definition, enchantment));
    if (!recipe) continue;
    recipes[enchantment ? `${baseItemId}@${enchantment}` : baseItemId] = recipe;
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(recipes)}\n`);
console.log(`Generated ${Object.keys(recipes).length} recipes at ${outputPath}`);
