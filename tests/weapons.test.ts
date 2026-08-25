import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  WEAPON_CONFIGS,
  getWeaponDisplayName,
  getWeaponWithEmoji,
  getWeaponsByType,
  isValidWeaponName,
} from '../src/utils/weaponConstants.js';

/**
 * Our weapon list against the game's own published table.
 *
 * The fixture is a snapshot of the official data tool's weapon table, produced
 * by scripts/refresh-official-weapons.mjs. Checking against it means a weapon
 * added to the game shows up as a failing test rather than as an unknown
 * weapon in someone's registration.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'official-weapons.json'), 'utf-8')
) as {
  source: string;
  fetchedAt: string;
  weapons: Array<{ officialId: number; name: string; iconUrl: string | null }>;
};

const configs = Object.values(WEAPON_CONFIGS);

describe('official weapon table', () => {
  it('has a snapshot to compare against', () => {
    assert.ok(fixture.weapons.length > 0);
    assert.match(fixture.source, /wherewindsmeetgame\.com/);
  });

  it('covers every weapon the game publishes', () => {
    const ours = new Set(configs.map((config) => config.displayNameEn));
    const missing = fixture.weapons
      .map((weapon) => weapon.name)
      .filter((name) => !ours.has(name));

    assert.deepEqual(
      missing,
      [],
      'the game published a weapon we do not know about - add it to WEAPON_CONFIGS'
    );
  });

  it('matches the official id and icon for every weapon that has one', () => {
    const byName = new Map(fixture.weapons.map((weapon) => [weapon.name, weapon]));

    for (const config of configs) {
      const official = byName.get(config.displayNameEn);

      if (!official) {
        // A weapon newer than the snapshot; nothing to compare against
        assert.equal(
          config.officialId,
          undefined,
          `${config.name} has an official id but is not in the snapshot`
        );
        continue;
      }

      assert.equal(config.officialId, official.officialId, `${config.name} id mismatch`);
      assert.equal(config.iconUrl, official.iconUrl ?? undefined, `${config.name} icon mismatch`);
    }
  });

  it('keeps the weapons the snapshot has not caught up with', () => {
    // The data tool lags the game; these were added by hand and must survive
    // a future refresh of the fixture
    for (const name of ['skygrasp_rope_dart', 'heavenwill_gauntlets'] as const) {
      assert.ok(WEAPON_CONFIGS[name], `${name} disappeared from WEAPON_CONFIGS`);
    }
  });
});

describe('weapon config integrity', () => {
  it('keys match their own name field', () => {
    for (const [key, config] of Object.entries(WEAPON_CONFIGS)) {
      assert.equal(config.name, key);
    }
  });

  it('every weapon has an emoji and both display names', () => {
    for (const config of configs) {
      assert.ok(config.emoji.length > 0, `${config.name} has no emoji`);
      assert.ok(config.displayNameEn.length > 0);
      assert.ok(config.displayNameVi.length > 0);
    }
  });

  it('uses each custom Discord emoji only once', () => {
    const custom = configs
      .map((config) => config.emoji)
      .filter((emoji) => emoji.startsWith('<:'));

    assert.equal(new Set(custom).size, custom.length, 'duplicate custom emoji');
  });

  it('groups every weapon under a type', () => {
    const grouped = getWeaponsByType();
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);

    assert.equal(total, configs.length, 'a weapon fell outside its type bucket');
  });

  it('renders a weapon with its emoji in both languages', () => {
    const rendered = getWeaponWithEmoji('strategic_sword', 'en');

    assert.ok(rendered.includes(WEAPON_CONFIGS.strategic_sword.emoji));
    assert.ok(rendered.includes('Strategic Sword'));

    assert.equal(getWeaponDisplayName('strategic_sword', 'vi'), 'Strategic Sword');
  });

  it('validates weapon names', () => {
    assert.equal(isValidWeaponName('strategic_sword'), true);
    assert.equal(isValidWeaponName('excalibur'), false);
  });
});
