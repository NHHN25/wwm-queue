import { strict as assert } from 'node:assert';
import { afterEach, describe, it } from 'node:test';
import { WEAPON_CONFIGS } from '../src/utils/weaponConstants.js';
import { ensureWeaponEmojis, type AppEmojiManager } from '../src/utils/weaponEmojiBootstrap.js';

const original = Object.fromEntries(
  Object.entries(WEAPON_CONFIGS).map(([key, config]) => [key, config.emoji])
);

afterEach(() => {
  for (const [key, emoji] of Object.entries(original)) {
    WEAPON_CONFIGS[key as keyof typeof WEAPON_CONFIGS].emoji = emoji;
  }
});

function fakeEmojis(uploaded: string[] = [], failFor: string[] = []) {
  const created: string[] = [];
  let nextId = 900;

  const tag = (name: string, id: number) => ({ name, toString: () => `<:${name}:${id}>` });

  const manager: AppEmojiManager = {
    async fetch() {
      return new Map(uploaded.map((name, i) => [String(i), tag(name, 100 + i)]));
    },
    async create({ attachment, name }) {
      assert.ok(attachment.byteLength > 0, 'uploaded an empty icon');
      if (failFor.includes(name)) throw new Error('Maximum number of emojis reached');
      created.push(name);
      return tag(name, nextId++);
    },
  };

  return { manager, created };
}

describe('weapon emoji bootstrap', () => {
  it('uploads bundled icons for placeholder weapons and swaps them in', async () => {
    const { manager, created } = fakeEmojis();

    const upgraded = await ensureWeaponEmojis(manager);

    assert.ok(upgraded.includes('museflow_waist_drum'));
    assert.ok(upgraded.includes('willowbend_fan'));
    assert.ok(created.includes('museflowwaistdrum'));
    assert.match(WEAPON_CONFIGS.museflow_waist_drum.emoji, /^<:museflowwaistdrum:\d+>$/);
    assert.match(WEAPON_CONFIGS.willowbend_fan.emoji, /^<:willowbendfan:\d+>$/);
  });

  it('leaves custom emojis alone and skips weapons with no bundled icon', async () => {
    const { manager, created } = fakeEmojis();

    await ensureWeaponEmojis(manager);

    assert.equal(WEAPON_CONFIGS.strategic_sword.emoji, original.strategic_sword);
    assert.ok(!created.includes('strategicsword'));
    // Skygrasp has no icon in assets/weapons yet
    assert.equal(WEAPON_CONFIGS.skygrasp_rope_dart.emoji, original.skygrasp_rope_dart);
  });

  it('reuses an emoji uploaded on an earlier start instead of duplicating it', async () => {
    const { manager, created } = fakeEmojis(['museflowwaistdrum']);

    await ensureWeaponEmojis(manager);

    assert.ok(!created.includes('museflowwaistdrum'));
    assert.equal(WEAPON_CONFIGS.museflow_waist_drum.emoji, '<:museflowwaistdrum:100>');
  });

  it('keeps the placeholder when one upload fails and carries on with the rest', async () => {
    const { manager } = fakeEmojis([], ['willowbendfan']);

    const upgraded = await ensureWeaponEmojis(manager);

    assert.equal(WEAPON_CONFIGS.willowbend_fan.emoji, original.willowbend_fan);
    assert.ok(upgraded.includes('museflow_waist_drum'));
    assert.ok(!upgraded.includes('willowbend_fan'));
  });

  it('does nothing when every weapon with an icon already has a custom emoji', async () => {
    const { manager, created } = fakeEmojis();
    await ensureWeaponEmojis(manager);

    const second = await ensureWeaponEmojis(manager);

    assert.deepEqual(second, []);
    assert.equal(created.length, 2);
  });
});
