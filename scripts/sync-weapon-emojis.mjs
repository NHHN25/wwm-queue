#!/usr/bin/env node
/**
 * Upload weapon icons to Discord as application emojis, then wire them into
 * the weapon list.
 *
 * Application emojis belong to the bot rather than to one server: they work in
 * every guild the bot is in and do not consume a server's emoji slots.
 *
 * Usage:
 *   node scripts/refresh-official-weapons.mjs     # snapshot the game's table
 *   node scripts/sync-weapon-emojis.mjs --dry-run # show what would change
 *   node scripts/sync-weapon-emojis.mjs           # upload and patch the source
 *
 * Needs DISCORD_TOKEN and DISCORD_CLIENT_ID in .env — the same values the bot
 * already runs with.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

import {
  addWeaponNameToUnion,
  appendWeaponToSource,
  applyEmojiToSource,
  guessWeaponType,
  planEmojiWork,
  toEmojiName,
} from './weaponEmojiSync.mjs';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_CLIENT_ID;

if (!dryRun && (!token || !applicationId)) {
  console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set (see .env.example)');
  process.exit(1);
}

const API = 'https://discord.com/api/v10';
const MAX_EMOJI_BYTES = 256 * 1024;

async function discord(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/**
 * Load WEAPON_CONFIGS without pulling in the TypeScript toolchain: the file is
 * a plain object literal, so the compiled output is enough.
 */
async function loadConfigs() {
  const { WEAPON_CONFIGS } = await import(
    new URL('../dist/utils/weaponConstants.js', import.meta.url).href
  ).catch(() => {
    throw new Error('run "npm run build" first so the weapon list can be read');
  });

  return WEAPON_CONFIGS;
}

const fixture = JSON.parse(
  readFileSync(join(root, 'tests', 'fixtures', 'official-weapons.json'), 'utf-8')
);

const configs = await loadConfigs();
const { work } = planEmojiWork(fixture.weapons, configs);

if (work.length === 0) {
  console.log('Every weapon already has a custom emoji. Nothing to do.');
  process.exit(0);
}

console.log(`${work.length} weapon(s) need an emoji:`);
for (const item of work) {
  console.log(`  ${item.kind === 'new' ? '+ new   ' : '~ emoji '} ${item.weapon.name}`);
}

if (dryRun) {
  console.log('\nDry run: nothing uploaded, no files changed.');
  process.exit(0);
}

// Reuse an emoji that is already uploaded rather than creating a duplicate
const existing = await discord(`/applications/${applicationId}/emojis`);
const existingByName = new Map((existing.items ?? []).map((e) => [e.name, e]));

let weaponSource = readFileSync(join(root, 'src', 'utils', 'weaponConstants.ts'), 'utf-8');
let typesSource = readFileSync(join(root, 'src', 'types', 'index.ts'), 'utf-8');

const summary = [];

for (const item of work) {
  const emojiName = toEmojiName(item.weapon.name);
  let emoji = existingByName.get(emojiName);

  if (!emoji) {
    const iconRes = await fetch(item.weapon.iconUrl);

    if (!iconRes.ok) {
      console.error(`  ! ${item.weapon.name}: icon fetch failed (${iconRes.status})`);
      continue;
    }

    const bytes = Buffer.from(await iconRes.arrayBuffer());

    if (bytes.byteLength > MAX_EMOJI_BYTES) {
      console.error(
        `  ! ${item.weapon.name}: icon is ${Math.round(bytes.byteLength / 1024)}KB, ` +
          `over Discord's 256KB limit - shrink it by hand and re-run`
      );
      continue;
    }

    emoji = await discord(`/applications/${applicationId}/emojis`, {
      method: 'POST',
      body: JSON.stringify({
        name: emojiName,
        image: `data:image/png;base64,${bytes.toString('base64')}`,
      }),
    });

    console.log(`  uploaded :${emojiName}:`);
  } else {
    console.log(`  reusing  :${emojiName}:`);
  }

  const tag = `<:${emoji.name}:${emoji.id}>`;

  if (item.kind === 'emoji') {
    weaponSource = applyEmojiToSource(weaponSource, item.slug, tag);
  } else {
    weaponSource = appendWeaponToSource(weaponSource, {
      slug: item.slug,
      type: guessWeaponType(item.weapon.name),
      emoji: tag,
      displayName: item.weapon.name,
      officialId: item.weapon.officialId,
      iconUrl: item.weapon.iconUrl,
    });

    typesSource = addWeaponNameToUnion(
      typesSource,
      item.slug,
      `${item.weapon.name}, added ${new Date().toISOString().slice(0, 10)}`
    );
  }

  summary.push(`${item.weapon.name} -> ${tag}`);
}

writeFileSync(join(root, 'src', 'utils', 'weaponConstants.ts'), weaponSource, 'utf-8');
writeFileSync(join(root, 'src', 'types', 'index.ts'), typesSource, 'utf-8');

console.log('\nUpdated:');
for (const line of summary) {
  console.log(`  ${line}`);
}

console.log('\nNow run: npm test && npm run build');
