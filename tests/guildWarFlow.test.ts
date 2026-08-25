import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { FakeDiscord } from './helpers/fakeDiscord.js';

/**
 * End-to-end walk through one Guild War week, driven by a fake clock and a
 * fake Discord client: Thursday auto-open, registrations, the T-1h ping, the
 * T-15m nudge, and the event finishing.
 */

// Must happen before the database module is imported
const dbPath = useTempDatabase('flow');

const db = await import('../src/database/database.js');
const { GuildWarEvent } = await import('../src/models/GuildWarEvent.js');
const { runGuildWarTick, openGuildWarEvents } = await import(
  '../src/utils/guildWarScheduler.js'
);

db.initializeDatabase();

const GUILD = 'guild-1';
const REG_CHANNEL = 'reg-1';
const ANNOUNCE_CHANNEL = 'ann-1';

const MINUTE = 60 * 1000;

// Thursday 2026-08-27, 12:00 in Vietnam
const THURSDAY_NOON = new Date('2026-08-27T05:00:00Z');
// Saturday 2026-08-29, 20:00 in Vietnam
const SATURDAY_START = new Date('2026-08-29T13:00:00Z');

const discord = new FakeDiscord('Test Guild');
const client = discord.asClient(GUILD);

discord.channel(REG_CHANNEL);
discord.channel(ANNOUNCE_CHANNEL);

db.updateGuildWarSettings(GUILD, {
  registrationChannelId: REG_CHANNEL,
  announceChannelId: ANNOUNCE_CHANNEL,
  timezone: 'Asia/Ho_Chi_Minh',
  satTime: '20:00',
  sunTime: '21:00',
  openWeekday: 4,
  openTime: '12:00',
  autoOpen: true,
  notifyLeadMin: 60,
  nudgeLeadMin: 15,
  capacity: 4,
});

after(() => {
  db.closeDatabase();
  removeTempDatabase(dbPath);
});

function saturdayEvent(): InstanceType<typeof GuildWarEvent> {
  const event = GuildWarEvent.loadUpcoming(GUILD).find((e) => e.getDay() === 'sat');
  assert.ok(event, 'expected a Saturday event');
  return event;
}

describe('Guild War week', () => {
  it('opens both weekend events on Thursday', async () => {
    const result = await runGuildWarTick(client, new Date(THURSDAY_NOON.getTime() + 30000));

    assert.equal(result.opened, 2);

    const events = GuildWarEvent.loadUpcoming(GUILD);
    assert.equal(events.length, 2);
    assert.deepEqual(
      events.map((e) => e.getDay()),
      ['sat', 'sun']
    );

    // One registration embed per event, both in the registration channel
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 2);
    assert.equal(discord.channel(ANNOUNCE_CHANNEL).sent.length, 0);

    // Each event knows the message it was posted as
    for (const event of events) {
      assert.ok(event.getMessageId(), 'event should be linked to its message');
    }
  });

  it('schedules the reminders an hour and a quarter-hour before start', () => {
    const event = saturdayEvent();

    assert.equal(event.getEventAt().toISOString(), SATURDAY_START.toISOString());
    assert.equal(
      event.getEventAt().getTime() - event.getNotifyAt().getTime(),
      60 * MINUTE
    );
    assert.equal(event.getEventAt().getTime() - event.getNudgeAt().getTime(), 15 * MINUTE);
  });

  it('does not open the same weekend twice', async () => {
    discord.reset();

    const result = await runGuildWarTick(client, new Date(THURSDAY_NOON.getTime() + HOURS(2)));

    assert.equal(result.opened, 0);
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);
    assert.equal(GuildWarEvent.loadUpcoming(GUILD).length, 2);
  });

  it('accepts registrations up to capacity, then blocks', () => {
    const event = saturdayEvent();

    assert.deepEqual(event.register('u1', 'nam', 'offense', 'tank'), {
      ok: true,
      updated: false,
    });
    assert.deepEqual(event.register('u2', 'an', 'offense', 'dps'), {
      ok: true,
      updated: false,
    });
    assert.deepEqual(event.register('u3', 'lan', 'defense', 'healer'), {
      ok: true,
      updated: false,
    });
    assert.deepEqual(event.register('u4', 'binh', 'defense', 'dps'), {
      ok: true,
      updated: false,
    });

    assert.equal(event.getSignupCount(), 4);
    assert.equal(event.isFull(), true);

    // Fifth player is turned away: capacity is shared across both sides
    assert.deepEqual(event.register('u5', 'cuong', 'offense', 'dps'), {
      ok: false,
      reason: 'full',
    });
    assert.equal(event.getSignupCount(), 4);
  });

  it('lets an existing player switch side even when full', () => {
    const event = saturdayEvent();

    assert.deepEqual(event.register('u1', 'nam', 'defense', 'tank'), {
      ok: true,
      updated: true,
    });

    const signup = event.getSignup('u1');
    assert.equal(signup?.team, 'defense');
    assert.equal(event.getSignupCount(), 4);

    // Put them back for the rest of the walkthrough
    event.register('u1', 'nam', 'offense', 'tank');
  });

  it('frees a slot on withdrawal', () => {
    const event = saturdayEvent();

    assert.equal(event.withdraw('u4'), true);
    assert.equal(event.getSignupCount(), 3);
    assert.equal(event.isFull(), false);

    // And the freed slot is usable
    assert.deepEqual(event.register('u4', 'binh', 'defense', 'dps'), {
      ok: true,
      updated: false,
    });
  });

  it('sends the T-1h ping split by side, to the announce channel', async () => {
    discord.reset();

    const event = saturdayEvent();
    const result = await runGuildWarTick(client, new Date(event.getNotifyAt().getTime() + 1000));

    assert.equal(result.notified, 1);

    const sent = discord.channel(ANNOUNCE_CHANNEL).sent;
    assert.equal(sent.length, 2, 'one message per side');

    const [offense, defense] = sent;

    // Header only on the first message, both carry attendance buttons
    assert.match(offense.content, /Guild War — Saturday/);
    assert.doesNotMatch(defense.content, /Guild War — Saturday/);
    assert.equal(offense.components.length, 1);
    assert.equal(defense.components.length, 1);

    // Mentions land in the right message, and only signed-up users are pingable
    assert.match(offense.content, /<@u1>/);
    assert.match(offense.content, /<@u2>/);
    assert.doesNotMatch(offense.content, /<@u3>/);
    assert.deepEqual(offense.allowedMentions?.users?.sort(), ['u1', 'u2']);
    assert.deepEqual(defense.allowedMentions?.users?.sort(), ['u3', 'u4']);

    // Roles are grouped inside each side
    assert.match(offense.content, /Tank: <@u1>/);
    assert.match(offense.content, /DPS: <@u2>/);
  });

  it('locks registration once the ping goes out', () => {
    const event = saturdayEvent();

    assert.equal(event.getStatus(), 'locked');
    assert.deepEqual(event.register('u5', 'cuong', 'offense', 'dps'), {
      ok: false,
      reason: 'locked',
    });
  });

  it('does not send the ping twice', async () => {
    discord.reset();

    const event = saturdayEvent();
    const result = await runGuildWarTick(client, new Date(event.getNotifyAt().getTime() + 5 * MINUTE));

    assert.equal(result.notified, 0);
    assert.equal(discord.channel(ANNOUNCE_CHANNEL).sent.length, 0);
  });

  it('nudges only the players who never answered', async () => {
    discord.reset();

    const event = saturdayEvent();

    event.setAttendance('u1', 'confirmed');
    event.setAttendance('u2', 'declined');

    assert.deepEqual(event.getAttendanceCounts(), {
      confirmed: 1,
      declined: 1,
      pending: 2,
    });

    const result = await runGuildWarTick(client, new Date(event.getNudgeAt().getTime() + 1000));

    assert.equal(result.nudged, 1);

    const sent = discord.channel(ANNOUNCE_CHANNEL).sent;
    assert.equal(sent.length, 1);
    assert.match(sent[0].content, /15 minutes left/);
    assert.deepEqual(sent[0].allowedMentions?.users?.sort(), ['u3', 'u4']);
    assert.doesNotMatch(sent[0].content, /<@u1>/);
    assert.doesNotMatch(sent[0].content, /<@u2>/);
  });

  it('does not nudge twice', async () => {
    discord.reset();

    const event = saturdayEvent();
    const result = await runGuildWarTick(client, new Date(event.getNudgeAt().getTime() + 2 * MINUTE));

    assert.equal(result.nudged, 0);
    assert.equal(discord.channel(ANNOUNCE_CHANNEL).sent.length, 0);
  });

  it('finishes the event once it starts', async () => {
    discord.reset();

    const result = await runGuildWarTick(client, new Date(SATURDAY_START.getTime() + MINUTE));

    // Saturday finishes; Sunday is still ahead and untouched
    assert.equal(result.finished, 1);

    const remaining = GuildWarEvent.loadUpcoming(GUILD);
    assert.deepEqual(
      remaining.map((e) => e.getDay()),
      ['sun']
    );

    // The registration embed was redrawn to show the finished state
    assert.ok(discord.channel(REG_CHANNEL).edits.length > 0);
  });

  it('keeps the roster after the event, for review', () => {
    const finished = db
      .getUpcomingGuildWarEvents(GUILD)
      .filter((row) => row.day === 'sat');

    assert.equal(finished.length, 0, 'Saturday is no longer upcoming');

    // The row and its signups still exist
    const rows = db.getGuildWarSignups(1);
    assert.equal(rows.length, 4);
  });
});

describe('manual open', () => {
  it('opens a single requested day and is idempotent', async () => {
    discord.reset();

    // Sunday already exists from the auto-open, Saturday has rolled over to next week
    const opened = await openGuildWarEvents(client, GUILD, {
      now: new Date(SATURDAY_START.getTime() + MINUTE),
      days: ['sun'],
    });

    assert.equal(opened.length, 1);
    assert.equal(opened[0].event.getDay(), 'sun');
    assert.equal(opened[0].posted, false, 'existing event is reused, not reposted');
    assert.equal(discord.channel(REG_CHANNEL).sent.length, 0);
  });

  it('does nothing when no registration channel is configured', async () => {
    const opened = await openGuildWarEvents(client, 'guild-without-config', {
      now: THURSDAY_NOON,
    });

    assert.deepEqual(opened, []);
  });
});

function HOURS(count: number): number {
  return count * 60 * MINUTE;
}
