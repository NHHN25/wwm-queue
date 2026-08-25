import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { FakeDiscord } from './helpers/fakeDiscord.js';

/**
 * Restart behaviour.
 *
 * The bot redeploys often, so the guarantees that matter are: a reminder due
 * while the bot was offline still goes out, and a reminder already sent is
 * never sent twice. Both are enforced by database state, not memory, which is
 * what these tests exercise — the connection is closed and reopened in between.
 */

const dbPath = useTempDatabase('restart');

const db = await import('../src/database/database.js');
const { GuildWarEvent } = await import('../src/models/GuildWarEvent.js');
const { openGuildWarEvents, runGuildWarTick } = await import(
  '../src/utils/guildWarScheduler.js'
);

db.initializeDatabase();

const GUILD = 'guild-1';
const REG_CHANNEL = 'reg-1';
const ANNOUNCE_CHANNEL = 'ann-1';

const MINUTE = 60 * 1000;
const THURSDAY_NOON = new Date('2026-08-27T05:00:00Z');

const discord = new FakeDiscord();
const client = discord.asClient(GUILD);

discord.channel(REG_CHANNEL);
discord.channel(ANNOUNCE_CHANNEL);

db.updateGuildWarSettings(GUILD, {
  registrationChannelId: REG_CHANNEL,
  announceChannelId: ANNOUNCE_CHANNEL,
  timezone: 'Asia/Ho_Chi_Minh',
  satTime: '20:00',
  sunTime: '21:00',
  autoOpen: false,
  notifyLeadMin: 60,
  nudgeLeadMin: 15,
});

const opened = await openGuildWarEvents(client, GUILD, { now: THURSDAY_NOON });
const saturday = opened.find((entry) => entry.event.getDay() === 'sat');
assert.ok(saturday);

const eventId = saturday.event.getId();
saturday.event.register('u1', 'nam', 'offense', 'tank');
saturday.event.register('u2', 'an', 'defense', 'dps');

/**
 * Drop the connection the way a redeploy would. The next database call
 * reopens it from DATABASE_PATH.
 */
function restart(): void {
  db.closeDatabase();
}

after(() => {
  db.closeDatabase();
  removeTempDatabase(dbPath);
});

describe('reminders across a restart', () => {
  it('sends a reminder that came due while the bot was down', async () => {
    restart();
    discord.reset();

    const event = GuildWarEvent.load(eventId);
    assert.ok(event);

    // The bot missed the exact T-60m moment; it comes back at T-5m
    const lateStart = new Date(event.getEventAt().getTime() - 5 * MINUTE);
    const result = await runGuildWarTick(client, lateStart);

    assert.equal(result.notified, 1, 'the missed reminder still fires');

    // Two side messages, and no nudge yet: nobody has had a chance to answer
    assert.equal(discord.channel(ANNOUNCE_CHANNEL).sent.length, 2);
    assert.equal(result.nudged, 0);
  });

  it('does not repeat a reminder that was already sent', async () => {
    restart();
    discord.reset();

    const event = GuildWarEvent.load(eventId);
    assert.ok(event);

    const result = await runGuildWarTick(
      client,
      new Date(event.getEventAt().getTime() - 4 * MINUTE)
    );

    assert.equal(result.notified, 0);
    assert.equal(discord.channel(ANNOUNCE_CHANNEL).sent.length, 0);
  });

  it('keeps the roster and attendance across a restart', () => {
    restart();

    const event = GuildWarEvent.load(eventId);
    assert.ok(event);

    event.setAttendance('u1', 'confirmed');

    restart();

    const reloaded = GuildWarEvent.load(eventId);
    assert.ok(reloaded);
    assert.equal(reloaded.getSignupCount(), 2);
    assert.equal(reloaded.getSignup('u1')?.attendance, 'confirmed');
    assert.equal(reloaded.getStatus(), 'locked');
  });

  it('still nudges the players who never answered', async () => {
    restart();
    discord.reset();

    const event = GuildWarEvent.load(eventId);
    assert.ok(event);

    const result = await runGuildWarTick(
      client,
      new Date(event.getEventAt().getTime() - 2 * MINUTE)
    );

    assert.equal(result.nudged, 1);

    const sent = discord.channel(ANNOUNCE_CHANNEL).sent;
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].allowedMentions?.users, ['u2']);
  });
});

describe('missing channels', () => {
  it('records the event even when the registration channel is gone', async () => {
    // A client whose channel fetch always fails, as after a channel deletion
    const brokenClient = {
      channels: { fetch: async () => null },
      guilds: { cache: new Map() },
    } as any;

    const result = await openGuildWarEvents(brokenClient, GUILD, {
      now: new Date('2026-09-03T05:00:00Z'), // the following Thursday
      days: ['sat'],
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].posted, false);
    assert.equal(result[0].event.getMessageId(), null, 'no message to link');

    // The row survives, so an admin can fix the channel and the reminder still fires
    const stored = db.getGuildWarEvent(result[0].event.getId());
    assert.ok(stored);
    assert.equal(stored.status, 'open');
  });

  it('retries later instead of losing a reminder to an unreachable channel', async () => {
    const brokenClient = {
      channels: { fetch: async () => null },
      guilds: { cache: new Map() },
    } as any;

    const nextSaturday = new Date('2026-09-05T13:00:00Z');
    const dueAt = new Date(nextSaturday.getTime() - 30 * MINUTE);

    const result = await runGuildWarTick(brokenClient, dueAt);

    // Nothing went out, and the event stays open so the next tick tries again
    assert.equal(result.notified, 0);

    const rows = db.getGuildWarEventsDueForNotify(dueAt);
    assert.ok(
      rows.some((row) => row.status === 'open' && row.notified_at === null),
      'the reminder is still pending'
    );

    // Once the channel is reachable again, the same reminder goes out
    discord.reset();
    const retry = await runGuildWarTick(client, dueAt);

    assert.equal(retry.notified, 1);
  });
});
