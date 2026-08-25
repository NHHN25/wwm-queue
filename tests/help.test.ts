import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { FakeDiscord, fakeButton } from './helpers/fakeDiscord.js';

/**
 * The /help guide, and the retirement of the old ad-hoc Guild War queue.
 */

const dbPath = useTempDatabase('help');

const db = await import('../src/database/database.js');
const { buildHelpCommand, createHelpEmbed } = await import('../src/commands/help.js');
const { buildCommands } = (await import('../src/commands/setup.js')) as any;
const { handleButtonInteraction } = await import('../src/components/queueButtons.js');
const { BUTTON_IDS } = await import('../src/utils/constants.js');

db.initializeDatabase();

const GUILD = 'guild-1';
const discord = new FakeDiscord();
const client = discord.asClient(GUILD);

after(() => {
  db.closeDatabase();
  removeTempDatabase(dbPath);
});

describe('/help command', () => {
  it('is open to everyone, not admin-gated', () => {
    const json = buildHelpCommand().toJSON() as any;

    assert.equal(json.name, 'help');
    assert.equal(json.default_member_permissions ?? null, null);
    assert.ok(json.description_localizations?.vi);
  });

  it('is registered exactly once', () => {
    const names = buildCommands().map((command: any) => command.toJSON().name);

    assert.equal(names.filter((name: string) => name === 'help').length, 1);
    assert.equal(new Set(names).size, names.length);
  });

  it('renders in both languages inside Discord embed limits', () => {
    for (const language of ['en', 'vi'] as const) {
      db.setGuildLanguage(GUILD, language);

      const embed = createHelpEmbed(GUILD, 'Bang Hội Test').toJSON();
      const total = JSON.stringify(embed).length;

      assert.ok(embed.fields && embed.fields.length > 0);

      for (const field of embed.fields) {
        assert.ok(
          field.value.length <= 1024,
          `${language}: field "${field.name}" is ${field.value.length} chars`
        );
        assert.ok(field.name.length <= 256);
      }

      assert.ok(total <= 6000, `${language}: embed is ${total} chars`);
    }

    db.setGuildLanguage(GUILD, 'en');
  });

  it('documents every command the bot actually registers', () => {
    const registered: string[] = buildCommands().map(
      (command: any) => command.toJSON().name
    );

    const guide = JSON.stringify(createHelpEmbed(GUILD));

    for (const name of registered) {
      if (name === 'help') {
        continue;
      }

      assert.ok(guide.includes(`/${name}`), `/${name} is missing from /help`);
    }
  });

  it('describes the Guild War flow in Vietnamese as Bang Chiến', () => {
    db.setGuildLanguage(GUILD, 'vi');

    const guide = JSON.stringify(createHelpEmbed(GUILD));

    assert.ok(guide.includes('Bang Chiến'));
    assert.ok(guide.includes('/guildwar schedule'));
    assert.ok(!guide.includes('Guild War —'), 'English heading leaked into the Vietnamese guide');

    db.setGuildLanguage(GUILD, 'en');
  });
});

describe('retired Guild War queue', () => {
  it('no longer offers /setup guild-war', () => {
    const setup = buildCommands()
      .map((command: any) => command.toJSON())
      .find((command: any) => command.name === 'setup');

    const subcommands = setup.options.map((option: any) => option.name);

    assert.deepEqual(subcommands.sort(), ['hero-realm', 'sword-trial']);
  });

  it('still allows closing leftover Guild War queues and panels', () => {
    const commands = buildCommands().map((command: any) => command.toJSON());

    for (const name of ['close', 'closepanel', 'reset']) {
      const command = commands.find((c: any) => c.name === name);
      const choices = command.options[0].choices.map((choice: any) => choice.value);

      assert.ok(choices.includes('guild_war'), `/${name} cannot clean up guild_war`);
    }
  });

  it('points leftover buttons at the new scheduled flow', async () => {
    for (const customId of [
      BUTTON_IDS.PANEL_CREATE_GUILD_WAR,
      BUTTON_IDS.JOIN_GUILD_WAR,
      'gw_submit_123456789',
    ]) {
      const interaction = fakeButton(customId, 'u1', 'nam', client, GUILD);

      await handleButtonInteraction(interaction as any);

      assert.match(interaction.lastContent() ?? '', /no longer used/i);
      assert.equal(interaction.replies[0].ephemeral, true);
    }
  });

  it('leaves the other panel buttons routed to the queue system', async () => {
    const { parsePanelButtonId } = await import('../src/utils/constants.js');

    // The retirement branch runs before panel routing, so the remaining panel
    // ids must still resolve to their queue types
    assert.deepEqual(parsePanelButtonId(BUTTON_IDS.PANEL_CREATE_SWORD_TRIAL), {
      action: 'panel_create',
      queueType: 'sword_trial',
    });
    assert.deepEqual(parsePanelButtonId(BUTTON_IDS.PANEL_CREATE_HERO_REALM), {
      action: 'panel_create',
      queueType: 'hero_realm',
    });
  });
});
