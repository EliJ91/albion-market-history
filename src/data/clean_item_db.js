// Script to clean itemDatabase.json by removing duplicate keys (keeping the first occurrence)
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'itemDatabase.json');
const raw = fs.readFileSync(filePath, 'utf8');

// Use regex to extract all key-value pairs, even with duplicate keys
const regex = /"(.*?)"\s*:\s*"(.*?)"/g;
let match;
const seen = new Set();
const cleaned = {};
while ((match = regex.exec(raw)) !== null) {
  const key = match[1];
  const value = match[2];
  if (!seen.has(key)) {
    cleaned[key] = value;
    seen.add(key);
  }
}

fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
console.log('Duplicates removed. Cleaned itemDatabase.json.');
