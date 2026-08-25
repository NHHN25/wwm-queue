import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { FakeDiscord } from './helpers/fakeDiscord.js';

/**
 * One Guild War per day, per guild.
 *
 * Once an event exists for a weekend day, nothing may add a second one for
 * that same day — not the weekly auto-open, not a repeated manual open, and
 * not a change to the configured start time.
 */

const dbPath = useTempDatabase('weekly');

const db = await import('../src/database/database.js');
const { GuildWarEvent } = await import('../src/models/GuildWarEvent.js');
const { openGuildWarEvents, runGuildWarTick } = await import(
  '../src/utils/guildWarScheduler.js'
);

db.initializeDatabase();

const REG_CHANNEL = 'reg-1';

// Wednesday 2026-08-26 and Thursday 2026-08-27, both 12:00 in Vietnam
const WEDNESDAY = new Date('2026-08-26T05:00:00Z');
const THURSDAY_NOON = new Date('2026-08-27T05:00:00Z');

const discord = new FakeDiscord();

function setupGuild(guildId: string): void {
  discord.channel(REG_CHANNEL);

  db.updateGuildWarSettings(guildId, {
    registrationChannelId: REG_CHANNEL,
    announceChannelId: 'ann-1',
    timezone: 'Asia/Ho_Chi_Minh',
    satTime: '06:30',
    sunTime: '06:30',
    openWeekday: 4,
    openTime: '12:00',
    autoOpen: true,
  });
}

after(() => {
  db.closeDatabase();
  removeTempDatabase(dbPath);
});

describe('weekly auto-open', () => {
  it('posts both events when nothing exists yet', async () => {
    const guildId = 'guild-fresh';
    setupGuild(guildId);
    discord.reset();

    const result = await runGuildWarTick(
      discord.asClient(guildId),
      new Date(THURSDAY_NOON.getTime() + 30000)
    );

    assert.equal(result.opened, 2);
    assert.equal(GuildWarEvent.loadUpcoming(guildId).length, 2);
  });

  it('stays quiet when an admin already opened the weekend manually', async () => {
    const guildId = 'guild-manual';
    setupGuild(guildId);

    const client = discord.asClient(guildId);

    // Admin opens on Wednesday, ahead of the Thursday automation
    const manual = await openGuildWarEvents(client, guildId, { now: WEDNESDAY });
    assert.equal(manual.filter((entry) => entry.posted).length, 2);

    discord.reset();

    const result = await runGuildWarTick(
      client,
      new Date(THURSDAY_NOON.getTime() + 30000)
    );

    assert.equal(result.opened, 0);
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);
    assert.equal(GuildWarEvent.loadUpcoming(guildId).length, 2);
  });

  it('stays quiet even after the start time is changed', async () => {
    const guildId = 'guild-retimed';
    setupGuild(guildId);

    const client = discord.asClient(guildId);

    await openGuildWarEvents(client, guildId, { now: WEDNESDAY });

    const before = GuildWarEvent.loadUpcoming(guildId);
    assert.equal(before.length, 2);

    // Admin decides the war is in the evening after all
    db.updateGuildWarSettings(guildId, { satTime: '20:00', sunTime: '20:00' });

    discord.reset();

    const result = await runGuildWarTick(
      client,
      new Date(THURSDAY_NOON.getTime() + 30000)
    );

    // The day already has an event, so no second one is created at the new hour
    assert.equal(result.opened, 0);
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);

    const after = GuildWarEvent.loadUpcoming(guildId);
    assert.equal(after.length, 2);
    assert.deepEqual(
      after.map((event) => event.getEventAt().toISOString()),
      before.map((event) => event.getEventAt().toISOString()),
      'the existing events keep their original times'
    );
  });

  it('opens only the day that is missing', async () => {
    const guildId = 'guild-partial';
    setupGuild(guildId);

    const client = discord.asClient(guildId);

    await openGuildWarEvents(client, guildId, { now: WEDNESDAY, days: ['sat'] });
    assert.equal(GuildWarEvent.loadUpcoming(guildId).length, 1);

    discord.reset();

    const result = await runGuildWarTick(
      client,
      new Date(THURSDAY_NOON.getTime() + 30000)
    );

    assert.equal(result.opened, 1, 'only Sunday is posted');

    const days = GuildWarEvent.loadUpcoming(guildId).map((event) => event.getDay());
    assert.deepEqual(days, ['sat', 'sun']);
  });

  it('does not resurrect a weekend an admin cancelled', async () => {
    const guildId = 'guild-cancelled';
    setupGuild(guildId);

    const client = discord.asClient(guildId);

    const opened = await openGuildWarEvents(client, guildId, { now: WEDNESDAY });
    const saturday = opened.find((entry) => entry.event.getDay() === 'sat');
    assert.ok(saturday);

    saturday.event.setStatus('cancelled');

    discord.reset();

    const result = await runGuildWarTick(
      client,
      new Date(THURSDAY_NOON.getTime() + 30000)
    );

    assert.equal(result.opened, 0);
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);

    const reloaded = GuildWarEvent.load(saturday.event.getId());
    assert.equal(reloaded?.getStatus(), 'cancelled');
  });

  it('is a no-op when a manual open repeats', async () => {
    const guildId = 'guild-repeat';
    setupGuild(guildId);

    const client = discord.asClient(guildId);

    await openGuildWarEvents(client, guildId, { now: WEDNESDAY });
    discord.reset();

    const again = await openGuildWarEvents(client, guildId, { now: WEDNESDAY });

    assert.equal(again.length, 2);
    assert.equal(
      again.filter((entry) => entry.posted).length,
      0,
      'both events already existed'
    );
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);
  });
});
