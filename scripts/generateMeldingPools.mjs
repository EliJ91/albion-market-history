import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const wikiPath = 'C:/Users/EJJER/Downloads/Artifact - Albion Online Wiki.html';
const databasePath = new URL('../src/data/itemDatabase.json', import.meta.url);
const outputPath = new URL('../src/data/meldingPools.json', import.meta.url);
const itemDatabase = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const itemIdByName = new Map(Object.entries(itemDatabase));
const document = new JSDOM(fs.readFileSync(wikiPath, 'utf8')).window.document;
const pools = {};

for (const table of document.querySelectorAll('table.wikitable')) {
  const caption = table.querySelector('caption')?.textContent.replace(/\s+/g, ' ').trim();
  const treeMatch = caption?.match(/^Tier 8 (Mage|Hunter|Warrior) artifacts$/i);
  if (!treeMatch) continue;

  const tree = treeMatch[1].toLowerCase();
  pools[tree] = {};

  for (const row of table.rows) {
    const titles = [...row.querySelectorAll('a[title]')].map((link) => link.title);
    const materialMatch = titles[0]?.match(/^Elder's (Rune|Soul|Relic|Avalonian Shard)$/);
    if (!materialMatch) continue;

    const material = materialMatch[1].toLowerCase().replace(' shard', '');
    pools[tree][material] = titles
      .slice(1)
      .filter((name) => !name.includes('Crystallized'))
      .map((name) => itemIdByName.get(name))
      .filter(Boolean);
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(pools, null, 2)}\n`);
