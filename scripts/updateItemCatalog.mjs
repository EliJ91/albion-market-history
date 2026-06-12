import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';
const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve('src/data/itemDatabase.json');
const existingCatalog = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const sourceText = sourcePath
  ? fs.readFileSync(sourcePath, 'utf8')
  : await fetch(SOURCE_URL).then((response) => {
    if (!response.ok) throw new Error(`Unable to download ${SOURCE_URL}: ${response.status}`);
    return response.text();
  });
const formattedItems = JSON.parse(sourceText);
const candidatesByName = new Map();

function itemIdScore(itemId) {
  let score = 0;
  if (!itemId.includes('@')) score += 100;
  if (!itemId.includes('_NONTRADABLE')) score += 20;
  if (!itemId.includes('_TEMPLATE')) score += 10;
  if (!itemId.startsWith('QUESTITEM_')) score += 5;
  return score - itemId.length / 1000;
}

for (const item of formattedItems) {
  const name = item.LocalizedNames?.['EN-US']?.trim();
  const itemId = item.UniqueName;
  if (!name || !itemId) continue;

  const current = candidatesByName.get(name);
  if (!current || itemIdScore(itemId) > itemIdScore(current)) {
    candidatesByName.set(name, itemId);
  }
}

const additions = [...candidatesByName.entries()]
  .filter(([name]) => existingCatalog[name] == null)
  .sort(([left], [right]) => left.localeCompare(right));
const updatedCatalog = Object.fromEntries([
  ...Object.entries(existingCatalog),
  ...additions,
]);

fs.writeFileSync(outputPath, `${JSON.stringify(updatedCatalog, null, 2)}\n`);
console.log(`Added ${additions.length} current item names; catalog now contains ${Object.keys(updatedCatalog).length} names.`);
