import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { en } from '../src/localization/en.js';
import { vi } from '../src/localization/vi.js';
import { buildGuildWarCommands } from '../src/commands/guildwar.js';

/**
 * Translation parity and slash-command validity.
 *
 * Discord rejects a malformed command at registration time, which on a live
 * bot means every command silently fails to update. Building the JSON here
 * runs discord.js's own validation without touching the API.
 */

const dbPath = useTempDatabase('config');

after(() => {
  removeTempDatabase(dbPath);
});

type Shape = string | { [key: string]: Shape };

/**
 * Describe an object's structure: key names, value kinds, and function arity
 */
function shapeOf(value: unknown): Shape {
  if (typeof value === 'function') {
    return `function/${(value as (...args: unknown[]) => unknown).length}`;
  }

  if (value === null || typeof value !== 'object') {
    return typeof value;
  }

  const shape: Record<string, Shape> = {};

  for (const key of Object.keys(value as object).sort()) {
    shape[key] = shapeOf((value as Record<string, unknown>)[key]);
  }

  return shape;
}

describe('translations', () => {
  it('English and Vietnamese have identical structure', () => {
    assert.deepEqual(shapeOf(vi), shapeOf(en));
  });

  it('every Guild War string is actually translated', () => {
    const enEvent = en.guildWarEvent as Record<string, unknown>;
    const viEvent = vi.guildWarEvent as Record<string, unknown>;

    const identical: string[] = [];

    for (const [key, value] of Object.entries(enEvent)) {
      if (typeof value !== 'string') {
        continue;
      }

      // Bare status emoji and separators are the same in both languages
      if (value.trim().length <= 2) {
        continue;
      }

      if (viEvent[key] === value) {
        identical.push(key);
      }
    }

    assert.deepEqual(identical, [], 'these keys were never translated');
  });

  it('uses Bang Chiến, not "Guild War", in Vietnamese', () => {
    assert.equal(vi.guildWarEvent.embedTitle, 'Bang Chiến');
    assert.equal(vi.queueTypes.guildWar, 'Bang Chiến');

    const viText = [
      vi.guildWarEvent.pingHeader('Thứ 7', '<t:1:R>'),
      vi.guildWarEvent.withdrawn,
      vi.guildWarEvent.eventCancelled('Thứ 7'),
    ];

    for (const text of viText) {
      assert.ok(!text.includes('Guild War'), `untranslated: ${text}`);
    }
  });

  it('names the two teams Công and Thủ by default', () => {
    assert.equal(vi.guildWar.teamOffense, 'Công');
    assert.equal(vi.guildWar.teamDefense, 'Thủ');
    assert.equal(en.guildWar.teamOffense, 'Offense');
    assert.equal(en.guildWar.teamDefense, 'Defense');
  });

  it('keeps the confirm and decline wording distinct from the join button', () => {
    // "Xác Nhận Tham Gia" already means "confirm join"; the attendance replies
    // must not repeat it or the two flows read identically.
    assert.notEqual(vi.guildWarEvent.attendanceConfirmed, vi.guildWar.submitJoin);
    assert.notEqual(vi.guildWarEvent.submitButton, vi.guildWar.submitJoin);
  });
});

describe('/guildwar command', () => {
  const commands = buildGuildWarCommands();
  const json = commands[0].toJSON() as any;

  it('builds without tripping discord.js validation', () => {
    assert.equal(commands.length, 1);
    assert.equal(json.name, 'guildwar');
    assert.ok(json.default_member_permissions, 'must be admin-gated');
  });

  it('exposes every subcommand the workflow needs', () => {
    const names = json.options.map((option: any) => option.name).sort();

    assert.deepEqual(names, [
      'auto',
      'cancel',
      'open',
      'ping',
      'roster',
      'schedule',
      'settings',
      'teams',
    ]);
  });

  it('is localized into Vietnamese', () => {
    assert.ok(json.description_localizations?.vi);

    for (const sub of json.options) {
      assert.ok(sub.description_localizations?.vi, `${sub.name} has no vi description`);
    }
  });

  it('respects Discord option limits', () => {
    for (const sub of json.options) {
      const options = sub.options ?? [];

      assert.ok(options.length <= 25, `${sub.name} has ${options.length} options`);
      assert.ok(sub.description.length <= 100);

      // Required options must come before optional ones
      let seenOptional = false;

      for (const option of options) {
        if (option.required) {
          assert.equal(seenOptional, false, `${sub.name}: required option after optional`);
        } else {
          seenOptional = true;
        }

        assert.ok(option.description.length <= 100);
        assert.match(option.name, /^[a-z0-9_-]+$/);
      }
    }
  });

  it('offers both days plus "both" when opening registration', () => {
    const open = json.options.find((option: any) => option.name === 'open');
    const choices = open.options[0].choices.map((choice: any) => choice.value);

    assert.deepEqual(choices, ['both', 'sat', 'sun']);
    assert.equal(open.options[0].required, false);
  });

  it('requires a day when cancelling, so nothing is called off by accident', () => {
    const cancel = json.options.find((option: any) => option.name === 'cancel');

    assert.equal(cancel.options[0].required, true);
  });
});

describe('command registry', () => {
  it('registers /guildwar exactly once, alongside the existing commands', async () => {
    const { buildCommands } = (await import('../src/commands/setup.js')) as any;
    const all = buildCommands().map((command: any) => command.toJSON().name);

    assert.equal(all.filter((name: string) => name === 'guildwar').length, 1);
    assert.equal(new Set(all).size, all.length, 'duplicate command names');

    // The pre-existing commands are still registered
    for (const name of ['setup', 'reset', 'close', 'language']) {
      assert.ok(all.includes(name), `${name} disappeared from the registry`);
    }
  });
});
