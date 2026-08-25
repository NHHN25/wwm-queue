import { strict as assert } from 'node:assert';
import { after, describe, it } from 'node:test';
import { removeTempDatabase, useTempDatabase } from './helpers/testDb.js';
import { FakeDiscord, fakeButton, fakeSelect } from './helpers/fakeDiscord.js';

/**
 * Button and select-menu handlers, driven with faked interactions.
 *
 * Covers what a player and an admin actually click: register, pick team and
 * role, confirm, withdraw, answer the reminder, and organize the teams.
 */

const dbPath = useTempDatabase('interactions');

const db = await import('../src/database/database.js');
const { GuildWarEvent } = await import('../src/models/GuildWarEvent.js');
const { openGuildWarEvents } = await import('../src/utils/guildWarScheduler.js');
const { handleGuildWarButton, handleGuildWarSelect } = await import(
  '../src/components/guildWarButtons.js'
);
const { handleOrganizerButton, handleOrganizerSelect } = await import(
  '../src/components/guildWarOrganizer.js'
);
const { buildGuildWarId, GW_IDS, parseGuildWarId } = await import(
  '../src/utils/guildWarConstants.js'
);

db.initializeDatabase();

const GUILD = 'guild-1';
const REG_CHANNEL = 'reg-1';

const THURSDAY_NOON = new Date('2026-08-27T05:00:00Z');

const discord = new FakeDiscord('Test Guild');
const client = discord.asClient(GUILD);

discord.channel(REG_CHANNEL);

db.updateGuildWarSettings(GUILD, {
  registrationChannelId: REG_CHANNEL,
  announceChannelId: REG_CHANNEL,
  timezone: 'Asia/Ho_Chi_Minh',
  satTime: '20:00',
  sunTime: '21:00',
  capacity: 3,
});

const opened = await openGuildWarEvents(client, GUILD, { now: THURSDAY_NOON });
const eventId = opened[0].event.getId();

after(() => {
  db.closeDatabase();
  removeTempDatabase(dbPath);
});

function event(): InstanceType<typeof GuildWarEvent> {
  const loaded = GuildWarEvent.load(eventId);
  assert.ok(loaded);
  return loaded;
}

/**
 * Walk a player through the whole ephemeral picker: Register, both dropdowns,
 * then Confirm.
 */
async function registerPlayer(
  userId: string,
  username: string,
  team: string,
  role: string
): Promise<string | undefined> {
  const open = fakeButton(
    buildGuildWarId(GW_IDS.REGISTER, eventId),
    userId,
    username,
    client
  );
  await handleGuildWarButton(open as any);

  if (open.replies[0]?.content) {
    // Rejected before the picker was shown
    return open.lastContent();
  }

  const teamSelect = fakeSelect(
    buildGuildWarId(GW_IDS.TEAM_SELECT, eventId),
    userId,
    username,
    client,
    [team]
  );
  await handleGuildWarSelect(teamSelect as any);

  const roleSelect = fakeSelect(
    buildGuildWarId(GW_IDS.ROLE_SELECT, eventId),
    userId,
    username,
    client,
    [role]
  );
  await handleGuildWarSelect(roleSelect as any);

  const submit = fakeButton(
    buildGuildWarId(GW_IDS.SUBMIT, eventId),
    userId,
    username,
    client
  );
  await handleGuildWarButton(submit as any);

  return submit.lastContent();
}

describe('custom id parsing', () => {
  it('round-trips every action', () => {
    for (const action of Object.values(GW_IDS)) {
      const id = buildGuildWarId(action, 42);
      assert.deepEqual(parseGuildWarId(id), { action, eventId: 42 });
    }
  });

  it('ignores ids from other features', () => {
    assert.equal(parseGuildWarId('queue_join_tank'), null);
    assert.equal(parseGuildWarId('registration_submit_123'), null);
    assert.equal(parseGuildWarId('approval_approve_9'), null);
    assert.equal(parseGuildWarId('gwe_register_notanumber'), null);
  });
});

describe('registration buttons', () => {
  it('shows the team and role pickers', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.REGISTER, eventId),
      'u1',
      'nam',
      client
    );

    const handled = await handleGuildWarButton(interaction as any);

    assert.equal(handled, true);
    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].ephemeral, true);
    assert.equal(interaction.replies[0].components?.length, 3);
  });

  it('registers a player and refreshes the public embed', async () => {
    discord.reset();

    const content = await registerPlayer('u1', 'nam', 'offense', 'tank');

    assert.match(content ?? '', /registered/i);

    const signup = event().getSignup('u1');
    assert.equal(signup?.team, 'offense');
    assert.equal(signup?.role, 'tank');

    // The registration message was re-rendered for everyone
    assert.equal(discord.channel(REG_CHANNEL).edits.length, 1);
  });

  it('reports an update when a player changes their choice', async () => {
    const content = await registerPlayer('u1', 'nam', 'defense', 'healer');

    assert.match(content ?? '', /updated/i);

    const signup = event().getSignup('u1');
    assert.equal(signup?.team, 'defense');
    assert.equal(signup?.role, 'healer');
    assert.equal(event().getSignupCount(), 1);
  });

  it('keeps the untouched half of the picker', async () => {
    // Only change the team; the role must survive
    const open = fakeButton(buildGuildWarId(GW_IDS.REGISTER, eventId), 'u1', 'nam', client);
    await handleGuildWarButton(open as any);

    const teamSelect = fakeSelect(
      buildGuildWarId(GW_IDS.TEAM_SELECT, eventId),
      'u1',
      'nam',
      client,
      ['offense']
    );
    await handleGuildWarSelect(teamSelect as any);

    const submit = fakeButton(buildGuildWarId(GW_IDS.SUBMIT, eventId), 'u1', 'nam', client);
    await handleGuildWarButton(submit as any);

    const signup = event().getSignup('u1');
    assert.equal(signup?.team, 'offense');
    assert.equal(signup?.role, 'healer');
  });

  it('turns away a new player once the event is full', async () => {
    await registerPlayer('u2', 'an', 'offense', 'dps');
    await registerPlayer('u3', 'lan', 'defense', 'dps');

    assert.equal(event().isFull(), true);

    const content = await registerPlayer('u4', 'binh', 'offense', 'dps');

    assert.match(content ?? '', /full/i);
    assert.equal(event().getSignup('u4'), null);
  });

  it('withdraws a player', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.WITHDRAW, eventId),
      'u3',
      'lan',
      client
    );

    await handleGuildWarButton(interaction as any);

    assert.match(interaction.lastContent() ?? '', /withdraw/i);
    assert.equal(event().getSignup('u3'), null);
  });

  it('rejects withdrawing when not registered', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.WITHDRAW, eventId),
      'u9',
      'ghost',
      client
    );

    await handleGuildWarButton(interaction as any);

    assert.match(interaction.lastContent() ?? '', /not registered/i);
  });

  it('reports a deleted event instead of throwing', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.REGISTER, 9999),
      'u1',
      'nam',
      client
    );

    await handleGuildWarButton(interaction as any);

    assert.match(interaction.lastContent() ?? '', /no longer exists/i);
  });

  it('leaves buttons from other features alone', async () => {
    const interaction = fakeButton('queue_join_tank', 'u1', 'nam', client);

    assert.equal(await handleGuildWarButton(interaction as any), false);
    assert.equal(interaction.replies.length, 0);
  });
});

describe('attendance buttons', () => {
  it('records ✅ and ❌', async () => {
    const confirm = fakeButton(
      buildGuildWarId(GW_IDS.CONFIRM, eventId),
      'u1',
      'nam',
      client
    );
    await handleGuildWarButton(confirm as any);

    const decline = fakeButton(
      buildGuildWarId(GW_IDS.DECLINE, eventId),
      'u2',
      'an',
      client
    );
    await handleGuildWarButton(decline as any);

    assert.equal(event().getSignup('u1')?.attendance, 'confirmed');
    assert.equal(event().getSignup('u2')?.attendance, 'declined');
    assert.deepEqual(event().getAttendanceCounts(), {
      confirmed: 1,
      declined: 1,
      pending: 0,
    });
  });

  it('rejects answers from players who never signed up', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.CONFIRM, eventId),
      'u9',
      'ghost',
      client
    );

    await handleGuildWarButton(interaction as any);

    assert.match(interaction.lastContent() ?? '', /not registered/i);
  });
});

describe('team organizer', () => {
  it('requires a player to be selected before moving anyone', async () => {
    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.ORG_MOVE_DEFENSE, eventId),
      'admin-1',
      'admin',
      client
    );

    const handled = await handleOrganizerButton(interaction as any);

    assert.equal(handled, true);
    assert.match(interaction.lastContent() ?? '', /select a player/i);
  });

  it('moves the selected player to the other side', async () => {
    const select = fakeSelect(
      buildGuildWarId(GW_IDS.ORG_PLAYER_SELECT, eventId),
      'admin-1',
      'admin',
      client,
      ['u2']
    );
    await handleOrganizerSelect(select as any);

    const before = event().getSignup('u2');
    assert.equal(before?.team, 'offense');

    const move = fakeButton(
      buildGuildWarId(GW_IDS.ORG_MOVE_DEFENSE, eventId),
      'admin-1',
      'admin',
      client
    );
    await handleOrganizerButton(move as any);

    const after = event().getSignup('u2');
    assert.equal(after?.team, 'defense');
    assert.equal(after?.assignedBy, 'admin-1', 'admin moves are attributed');
    assert.match(move.lastContent() ?? '', /Moved/i);
  });

  it('rejects moving someone who is not on the roster', async () => {
    const select = fakeSelect(
      buildGuildWarId(GW_IDS.ORG_PLAYER_SELECT, eventId),
      'admin-1',
      'admin',
      client,
      ['u9']
    );
    await handleOrganizerSelect(select as any);

    const move = fakeButton(
      buildGuildWarId(GW_IDS.ORG_MOVE_OFFENSE, eventId),
      'admin-1',
      'admin',
      client
    );
    await handleOrganizerButton(move as any);

    assert.match(move.lastContent() ?? '', /not registered/i);
  });

  it('spreads roles across both sides when auto-balancing', async () => {
    const current = event();

    // Everyone piled onto one side
    current.register('u2', 'an', 'offense', 'dps');
    current.register('u3', 'lan', 'offense', 'healer');
    db.updateGuildWarSettings(GUILD, { capacity: 10 });

    const balance = fakeButton(
      buildGuildWarId(GW_IDS.ORG_BALANCE, eventId),
      'admin-1',
      'admin',
      client
    );
    await handleOrganizerButton(balance as any);

    const grouped = event().getSignupsBySide();

    // Three players, so one side gets two and the other one — never all three
    assert.ok(grouped.offense.length > 0);
    assert.ok(grouped.defense.length > 0);
    assert.equal(grouped.offense.length + grouped.defense.length, 3);
  });

  it('removes a player from the roster', async () => {
    const select = fakeSelect(
      buildGuildWarId(GW_IDS.ORG_PLAYER_SELECT, eventId),
      'admin-1',
      'admin',
      client,
      ['u3']
    );
    await handleOrganizerSelect(select as any);

    const remove = fakeButton(
      buildGuildWarId(GW_IDS.ORG_REMOVE, eventId),
      'admin-1',
      'admin',
      client
    );
    await handleOrganizerButton(remove as any);

    assert.equal(event().getSignup('u3'), null);
    assert.match(remove.lastContent() ?? '', /Removed/i);
  });
});

describe('language', () => {
  it('answers in Vietnamese when the guild is set to vi', async () => {
    db.setGuildLanguage(GUILD, 'vi');

    const interaction = fakeButton(
      buildGuildWarId(GW_IDS.WITHDRAW, eventId),
      'u9',
      'ghost',
      client
    );
    await handleGuildWarButton(interaction as any);

    assert.match(interaction.lastContent() ?? '', /Bạn chưa đăng ký/);

    db.setGuildLanguage(GUILD, 'en');
  });
});
