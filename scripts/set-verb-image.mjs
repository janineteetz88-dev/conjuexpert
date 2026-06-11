#!/usr/bin/env node
/**
 * Set a custom image or search query for a specific verb page.
 *
 * Usage:
 *   node scripts/set-verb-image.mjs es/trabajar --query "office work laptop"
 *   node scripts/set-verb-image.mjs es/trabajar --url "https://images.pexels.com/..."
 *   node scripts/set-verb-image.mjs --list
 *   node scripts/set-verb-image.mjs --delete es/trabajar
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'verb-images.json');

function load() {
  if (!fs.existsSync(FILE)) return {};
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  // Strip internal _comment/_format keys
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));
}

function save(data) {
  const meta = {
    _comment: 'Custom image overrides for verb pages. Key = \'lang/verb\'.',
    _format: {
      query: 'Custom Pexels search query instead of auto-derived meaning',
      url: 'Direct image URL (skips Pexels entirely)',
      alt: 'Custom alt text (optional)',
      authorName: 'Photo credit name (optional)',
      authorUrl: 'Photo credit URL (optional)',
      sourceUrl: 'Link to original photo (optional)',
      sourceName: 'Source name e.g. Pexels (optional)',
    },
  };
  fs.writeFileSync(FILE, JSON.stringify({ ...meta, ...data }, null, 2));
}

const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  const data = load();
  const entries = Object.entries(data);
  if (entries.length === 0) {
    console.log('No custom images set yet.');
  } else {
    console.log(`${entries.length} custom image overrides:\n`);
    for (const [key, val] of entries) {
      console.log(`  ${key}`);
      if (val.query) console.log(`    query: "${val.query}"`);
      if (val.url)   console.log(`    url: "${val.url}"`);
    }
  }
  process.exit(0);
}

const deleteIdx = args.indexOf('--delete');
if (deleteIdx !== -1) {
  const key = args[deleteIdx + 1];
  if (!key) { console.error('Usage: --delete lang/verb'); process.exit(1); }
  const data = load();
  if (!data[key]) { console.log(`No entry for "${key}".`); process.exit(0); }
  delete data[key];
  save(data);
  console.log(`Deleted image override for "${key}".`);
  process.exit(0);
}

const key = args[0];
if (!key || key.startsWith('--')) {
  console.error(`Usage:
  node scripts/set-verb-image.mjs <lang/verb> --query "search terms"
  node scripts/set-verb-image.mjs <lang/verb> --url "https://..."
  node scripts/set-verb-image.mjs --list
  node scripts/set-verb-image.mjs --delete <lang/verb>`);
  process.exit(1);
}

if (!key.match(/^[a-z]{2}\/.+$/)) {
  console.error(`Key must be in format "lang/verb", e.g. "es/trabajar".`);
  process.exit(1);
}

const entry = {};
const queryIdx = args.indexOf('--query');
const urlIdx = args.indexOf('--url');
const altIdx = args.indexOf('--alt');

if (queryIdx !== -1) entry.query = args[queryIdx + 1];
if (urlIdx !== -1)   entry.url   = args[urlIdx + 1];
if (altIdx !== -1)   entry.alt   = args[altIdx + 1];

if (!entry.query && !entry.url) {
  console.error('Provide either --query "search terms" or --url "https://..."');
  process.exit(1);
}

const data = load();
data[key] = { ...(data[key] || {}), ...entry };
save(data);

console.log(`✓ Set image override for "${key}":`);
if (entry.query) console.log(`  query: "${entry.query}"`);
if (entry.url)   console.log(`  url:   "${entry.url}"`);
console.log('\nRun the generator to apply: npm run generate-verb-pages');
