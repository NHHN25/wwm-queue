#!/usr/bin/env node
/**
 * Refresh the snapshot of the official weapon table.
 *
 * The game's data tool publishes its reference tables as static files, but
 * lightly obfuscated: the payload is base64 of the JSON, then a junk character
 * is inserted every 100 characters, then the whole string is reversed. Undo
 * those three steps and it is plain JSON.
 *
 * Run this when the game adds a weapon:
 *   node scripts/refresh-official-weapons.mjs
 *
 * It rewrites tests/fixtures/official-weapons.json, which the weapon test
 * checks our own list against. Nothing at runtime depends on the network.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bump this when the data tool publishes a newer build
const DATA_BUILD = '20251203102905';
const SOURCE = `https://www.wherewindsmeetgame.com/pc/qt/${DATA_BUILD}/data/kongfu/kongfu.txt`;

const JUNK_INTERVAL = 100;

/**
 * Undo the obfuscation described above
 */
function decodeTable(body) {
  const reversed = body.trim().split('').reverse().join('');

  const cleaned = reversed
    .split('')
    .filter((_, index) => (index + 1) % JUNK_INTERVAL !== 0)
    .join('');

  return JSON.parse(Buffer.from(cleaned, 'base64').toString('utf-8'));
}

const response = await fetch(SOURCE);

if (!response.ok) {
  console.error(`Failed to fetch ${SOURCE}: ${response.status}`);
  process.exit(1);
}

const table = decodeTable(await response.text());

// Entries without a name are placeholders for unreleased or internal content
const weapons = Object.values(table)
  .filter((entry) => entry.name)
  .map((entry) => ({
    officialId: Number(entry.id),
    name: entry.name,
    iconUrl: entry.pic_url || null,
  }))
  .sort((a, b) => a.officialId - b.officialId);

const outPath = join(__dirname, '..', 'tests', 'fixtures', 'official-weapons.json');
mkdirSync(dirname(outPath), { recursive: true });

writeFileSync(
  outPath,
  `${JSON.stringify({ source: SOURCE, fetchedAt: new Date().toISOString().slice(0, 10), weapons }, null, 2)}\n`,
  'utf-8'
);

console.log(`Wrote ${weapons.length} weapons to ${outPath}`);
