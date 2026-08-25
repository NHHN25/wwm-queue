import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  addWeaponNameToUnion,
  appendWeaponToSource,
  applyEmojiToSource,
  guessWeaponType,
  planEmojiWork,
  toEmojiName,
  toWeaponSlug,
} from '../scripts/weaponEmojiSync.mjs';

/**
 * The source-rewriting half of the emoji sync.
 *
 * The upload itself needs a token and is left to a manual run; everything that
 * decides what to upload and edits the source is pure and tested here.
 */

describe('naming', () => {
  it('builds Discord-legal emoji names', () => {
    assert.equal(toEmojiName('Skygrasp Rope Dart'), 'skygraspropedart');
    assert.equal(toEmojiName("Dragon's Breath"), 'dragonsbreath');
    assert.match(toEmojiName('Strategic Sword'), /^[a-z0-9_]{2,32}$/);
  });

  it('builds config keys', () => {
    assert.equal(toWeaponSlug('Skygrasp Rope Dart'), 'skygrasp_rope_dart');
    assert.equal(toWeaponSlug('Heavenwill Gauntlets'), 'heavenwill_gauntlets');
  });

  it('guesses the weapon type from the name', () => {
    assert.equal(guessWeaponType('Nameless Spear'), 'spear');
    assert.equal(guessWeaponType('Inkwell Fan'), 'fans');
    assert.equal(guessWeaponType('Vernal Umbrella'), 'umbrella');
    assert.equal(guessWeaponType('Mortal Rope Dart'), 'rope_dart');
    assert.equal(guessWeaponType('Heavenwill Gauntlets'), 'gauntlets');
    assert.equal(guessWeaponType('Infernal Twinblades'), 'dual_blades');
    assert.equal(guessWeaponType('Snowparting Blade'), 'sword');
  });
});

describe('planning', () => {
  const official = [
    { officialId: 1, name: 'Strategic Sword', iconUrl: 'https://x/1.png' },
    { officialId: 2, name: 'Skygrasp Rope Dart', iconUrl: 'https://x/2.png' },
    { officialId: 3, name: 'Brand New Blade', iconUrl: 'https://x/3.png' },
    { officialId: 4, name: 'No Icon Weapon', iconUrl: null },
  ];

  const configs = {
    strategic_sword: {
      name: 'strategic_sword',
      displayNameEn: 'Strategic Sword',
      emoji: '<:strategicsword:123>',
    },
    skygrasp_rope_dart: {
      name: 'skygrasp_rope_dart',
      displayNameEn: 'Skygrasp Rope Dart',
      emoji: '🪢',
    },
  };

  it('skips weapons that already have a custom emoji', () => {
    const { work } = planEmojiWork(official, configs);

    assert.ok(!work.some((item) => item.weapon.name === 'Strategic Sword'));
  });

  it('upgrades placeholder unicode emojis', () => {
    const { work } = planEmojiWork(official, configs);
    const item = work.find((entry) => entry.weapon.name === 'Skygrasp Rope Dart');

    assert.ok(item);
    assert.equal(item.kind, 'emoji');
    assert.equal(item.slug, 'skygrasp_rope_dart');
  });

  it('flags weapons we do not know about yet', () => {
    const { work } = planEmojiWork(official, configs);
    const item = work.find((entry) => entry.weapon.name === 'Brand New Blade');

    assert.ok(item);
    assert.equal(item.kind, 'new');
    assert.equal(item.slug, 'brand_new_blade');
  });

  it('ignores entries with no icon to upload', () => {
    const { work } = planEmojiWork(official, configs);

    assert.ok(!work.some((item) => item.weapon.name === 'No Icon Weapon'));
  });
});

describe('source rewriting', () => {
  const source = [
    'export const WEAPON_CONFIGS: Record<WeaponName, WeaponConfig> = {',
    '  skygrasp_rope_dart: {',
    "    name: 'skygrasp_rope_dart',",
    "    type: 'rope_dart',",
    "    emoji: '🪢',",
    "    displayNameEn: 'Skygrasp Rope Dart',",
    "    displayNameVi: 'Skygrasp Rope Dart',",
    '  },',
    '};',
    '',
  ].join('\n');

  it('swaps the emoji of an existing weapon', () => {
    const updated = applyEmojiToSource(source, 'skygrasp_rope_dart', '<:skygrasp:99>');

    assert.ok(updated.includes("emoji: '<:skygrasp:99>',"));
    assert.ok(!updated.includes("emoji: '🪢',"));

    // Nothing else moved
    assert.ok(updated.includes("displayNameEn: 'Skygrasp Rope Dart',"));
  });

  it('leaves the source alone for an unknown weapon', () => {
    assert.equal(applyEmojiToSource(source, 'not_a_weapon', '<:x:1>'), source);
  });

  it('appends a new weapon inside the object literal', () => {
    const updated = appendWeaponToSource(source, {
      slug: 'brand_new_blade',
      type: 'sword',
      emoji: '<:brandnewblade:42>',
      displayName: 'Brand New Blade',
      officialId: 3,
      iconUrl: 'https://x/3.png',
    });

    assert.ok(updated.includes('  brand_new_blade: {'));
    assert.ok(updated.includes("    officialId: 3,"));

    // The new entry lands before the closing brace, not after it
    assert.ok(updated.indexOf('brand_new_blade') < updated.lastIndexOf('};'));
  });

  it('extends the WeaponName union once', () => {
    const types = [
      'export type WeaponName =',
      "  | 'strategic_sword'",
      "  | 'heavenwill_gauntlets';",
      '',
    ].join('\n');

    const once = addWeaponNameToUnion(types, 'brand_new_blade', 'Brand New Blade');
    assert.ok(once.includes("| 'brand_new_blade';"));
    assert.ok(once.includes("| 'heavenwill_gauntlets'\n"));

    // Running the sync twice must not duplicate the member
    const twice = addWeaponNameToUnion(once, 'brand_new_blade', 'Brand New Blade');
    assert.equal(twice.match(/brand_new_blade/g)?.length, once.match(/brand_new_blade/g)?.length);
  });
});
