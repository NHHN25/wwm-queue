import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { en } from '../src/localization/en.js';
import { vi } from '../src/localization/vi.js';
import {
  buildGuildWarNudgeMessage,
  buildGuildWarPingMessages,
  buildGuildWarRosterText,
  createAttendanceButtons,
  createGuildWarButtons,
  createGuildWarEmbed,
  createGuildWarSelectComponents,
} from '../src/utils/guildWarEmbeds.js';
import type {
  GuildWarEvent,
  GuildWarProfile,
  GuildWarSide,
  GuildWarSignup,
  PlayerRole,
} from '../src/types/index.js';
import { WEAPON_CONFIGS } from '../src/utils/weaponConstants.js';

/**
 * Rendering checks, including the Discord limits that only bite at full size:
 * 1024 characters per embed field, 6000 per embed, 2000 per message.
 */

const EVENT_AT = new Date('2026-08-29T13:00:00Z');

function makeEvent(overrides: Partial<GuildWarEvent> = {}): GuildWarEvent {
  return {
    id: 1,
    guildId: 'guild-1',
    channelId: 'reg-1',
    messageId: 'msg-1',
    day: 'sat',
    eventAt: EVENT_AT,
    notifyAt: new Date(EVENT_AT.getTime() - 60 * 60 * 1000),
    nudgeAt: new Date(EVENT_AT.getTime() - 15 * 60 * 1000),
    notifiedAt: null,
    nudgedAt: null,
    capacity: 30,
    status: 'open',
    createdAt: new Date('2026-08-27T05:00:00Z'),
    ...overrides,
  };
}

/**
 * A full 30-player roster: worst case for Discord's size limits.
 * Discord snowflake ids are 18-19 digits, so use realistic ones.
 */
function makeSignups(count: number): GuildWarSignup[] {
  const roles: PlayerRole[] = ['tank', 'healer', 'dps'];

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    eventId: 1,
    userId: String(100000000000000000n + BigInt(index)),
    username: `NguoiChoiTenRatDai${index}`,
    team: (index % 2 === 0 ? 'offense' : 'defense') as GuildWarSide,
    role: roles[index % roles.length],
    attendance: 'unknown' as const,
    assignedBy: null,
    joinedAt: new Date('2026-08-27T06:00:00Z'),
  }));
}

describe('registration embed', () => {
  it('renders an empty event', () => {
    const embed = createGuildWarEmbed(makeEvent(), [], en, { notifyLeadMin: 60 }).toJSON();

    assert.match(embed.title ?? '', /Guild War — Saturday/);
    assert.equal(embed.description, en.guildWarEvent.statusOpen);
    assert.ok(embed.fields?.some((f) => f.value.includes('No one has signed up')));
  });

  it('groups players by side and counts them', () => {
    const embed = createGuildWarEmbed(makeEvent(), makeSignups(6), en, {
      notifyLeadMin: 60,
    }).toJSON();

    const names = embed.fields?.map((f) => f.name) ?? [];

    assert.ok(names.some((n) => n.includes('Offense (3)')));
    assert.ok(names.some((n) => n.includes('Defense (3)')));

    const signupField = embed.fields?.find((f) => f.name === en.guildWarEvent.fieldSignups);
    assert.match(signupField?.value ?? '', /\*\*6\*\* \/ 30/);
  });

  it('uses the guild custom team names when set', () => {
    const embed = createGuildWarEmbed(makeEvent(), makeSignups(2), en, {
      notifyLeadMin: 60,
      sideNames: { offense: 'Chủ Lực', defense: 'Dự Bị' },
    }).toJSON();

    const names = embed.fields?.map((f) => f.name) ?? [];

    assert.ok(names.some((n) => n.includes('Chủ Lực')));
    assert.ok(names.some((n) => n.includes('Dự Bị')));
  });

  it('hides attendance until the reminder has been sent', () => {
    const before = createGuildWarEmbed(makeEvent(), makeSignups(4), en, {
      notifyLeadMin: 60,
    }).toJSON();

    assert.ok(!JSON.stringify(before).includes('⏳'));

    const signups = makeSignups(4);
    signups[0].attendance = 'confirmed';
    signups[1].attendance = 'declined';

    const after = createGuildWarEmbed(
      makeEvent({ notifiedAt: new Date(), status: 'locked' }),
      signups,
      en,
      { notifyLeadMin: 60 }
    ).toJSON();

    const rendered = JSON.stringify(after);
    assert.match(rendered, /✅ 1 · ❌ 1 · ⏳ 2/);
    assert.equal(after.description, en.guildWarEvent.statusLocked);
  });

  it('stays inside Discord limits with a full 30-player roster', () => {
    for (const t of [en, vi]) {
      const embed = createGuildWarEmbed(makeEvent(), makeSignups(30), t, {
        guildName: 'Bang Hội Rất Dài Tên',
        notifyLeadMin: 60,
      }).toJSON();

      const total = JSON.stringify(embed).length;

      for (const field of embed.fields ?? []) {
        assert.ok(
          field.value.length <= 1024,
          `field "${field.name}" is ${field.value.length} chars`
        );
        assert.ok(field.name.length <= 256);
      }

      assert.ok(total <= 6000, `embed is ${total} chars`);
    }
  });
});

describe('registration components', () => {
  it('offers exactly two teams and three roles', () => {
    const rows = createGuildWarSelectComponents(1, en).map((row) => row.toJSON());

    const teamOptions = (rows[0].components[0] as any).options;
    const roleOptions = (rows[1].components[0] as any).options;

    assert.deepEqual(
      teamOptions.map((o: any) => o.value),
      ['offense', 'defense']
    );
    assert.deepEqual(
      roleOptions.map((o: any) => o.value),
      ['tank', 'healer', 'dps']
    );
  });

  it('pre-selects the player current choice', () => {
    const rows = createGuildWarSelectComponents(1, en, {
      currentTeam: 'defense',
      currentRole: 'healer',
    }).map((row) => row.toJSON());

    const teamOptions = (rows[0].components[0] as any).options;
    const roleOptions = (rows[1].components[0] as any).options;

    assert.equal(teamOptions.find((o: any) => o.value === 'defense').default, true);
    assert.equal(teamOptions.find((o: any) => o.value === 'offense').default, false);
    assert.equal(roleOptions.find((o: any) => o.value === 'healer').default, true);
  });

  it('disables register and withdraw once locked', () => {
    const row = createGuildWarButtons(1, en, true).toJSON();

    for (const button of row.components as any[]) {
      assert.equal(button.disabled, true);
    }
  });

  it('labels the attendance buttons with emoji only', () => {
    const row = createAttendanceButtons(1).toJSON();
    const buttons = row.components as any[];

    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].label, undefined);
    assert.equal(buttons[1].label, undefined);
    assert.equal(buttons[0].emoji?.name, '✅');
    assert.equal(buttons[1].emoji?.name, '❌');
  });
});

describe('reminder pings', () => {
  it('sends one message per side, grouped by role', () => {
    const messages = buildGuildWarPingMessages(makeEvent(), makeSignups(6), en);

    assert.equal(messages.length, 2);
    assert.match(messages[0].content, /\*\*Offense\*\* \(3\)/);
    assert.match(messages[1].content, /\*\*Defense\*\* \(3\)/);

    // Every signed-up user appears exactly once, in their own side's message
    const allMentioned = messages.flatMap((m) => m.userIds);
    assert.equal(new Set(allMentioned).size, 6);
  });

  it('skips a side with nobody on it', () => {
    const signups = makeSignups(4).map((s) => ({ ...s, team: 'offense' as GuildWarSide }));
    const messages = buildGuildWarPingMessages(makeEvent(), signups, en);

    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /starts <t:/);
  });

  it('produces nothing when nobody signed up', () => {
    assert.deepEqual(buildGuildWarPingMessages(makeEvent(), [], en), []);
  });

  it('stays under the 2000-character message limit at full size', () => {
    for (const t of [en, vi]) {
      const messages = buildGuildWarPingMessages(makeEvent(), makeSignups(30), t);

      for (const message of messages) {
        assert.ok(
          message.content.length <= 2000,
          `ping is ${message.content.length} chars`
        );
      }
    }
  });

  it('restricts mentions to the players it names', () => {
    const messages = buildGuildWarPingMessages(makeEvent(), makeSignups(6), en);

    for (const message of messages) {
      for (const userId of message.userIds) {
        assert.ok(message.content.includes(`<@${userId}>`));
      }
    }
  });
});

describe('nudge', () => {
  it('names only the players who have not answered', () => {
    const signups = makeSignups(6);
    signups[0].attendance = 'confirmed';

    const unconfirmed = signups.filter((s) => s.attendance === 'unknown');
    const message = buildGuildWarNudgeMessage(makeEvent(), unconfirmed, en, 15);

    assert.ok(message);
    assert.equal(message.userIds.length, 5);
    assert.ok(!message.content.includes(`<@${signups[0].userId}>`));
    assert.match(message.content, /15 minutes left/);
  });

  it('is skipped when everyone answered', () => {
    assert.equal(buildGuildWarNudgeMessage(makeEvent(), [], en, 15), null);
  });

  it('stays under the message limit when nobody answered', () => {
    for (const t of [en, vi]) {
      const message = buildGuildWarNudgeMessage(makeEvent(), makeSignups(30), t, 15);

      assert.ok(message);
      assert.ok(
        message.content.length <= 2000,
        `nudge is ${message.content.length} chars`
      );
    }
  });
});

describe('roster export', () => {
  it('lists cached usernames rather than mentions', () => {
    const roster = buildGuildWarRosterText(makeEvent(), makeSignups(4), en);

    assert.match(roster, /Roster — Saturday/);
    assert.match(roster, /NguoiChoiTenRatDai0/);
    assert.ok(!roster.includes('<@'), 'roster must not ping anyone');
  });

  it('marks attendance once the reminder has been sent', () => {
    const signups = makeSignups(2);
    signups[0].attendance = 'confirmed';
    signups[1].attendance = 'declined';

    const roster = buildGuildWarRosterText(
      makeEvent({ notifiedAt: new Date() }),
      signups,
      en
    );

    assert.match(roster, /NguoiChoiTenRatDai0 ✅/);
    assert.match(roster, /NguoiChoiTenRatDai1 ❌/);
  });
});

/**
 * Registrations as filled in through /baodanh, for the players who have one
 */
function makeProfiles(signups: GuildWarSignup[]): Map<string, GuildWarProfile> {
  return new Map(
    signups.map((signup, index) => [
      signup.userId,
      {
        ingameName: `TieuLongNu${index}`,
        primaryWeapon: 'strategic_sword' as const,
        secondaryWeapon: 'panacea_fan' as const,
      },
    ])
  );
}

describe('roster with player profiles', () => {
  it('shows the in-game name and both weapons on a small roster', () => {
    const signups = makeSignups(4);

    const embed = createGuildWarEmbed(makeEvent(), signups, en, {
      notifyLeadMin: 60,
      profiles: makeProfiles(signups),
    }).toJSON();

    const rendered = JSON.stringify(embed);

    assert.ok(rendered.includes('TieuLongNu0'), 'in-game name is missing');
    assert.ok(
      rendered.includes(WEAPON_CONFIGS.strategic_sword.emoji),
      'primary weapon emoji is missing'
    );
    assert.ok(
      rendered.includes(WEAPON_CONFIGS.panacea_fan.emoji),
      'secondary weapon emoji is missing'
    );

    // The mention stays: it is what makes a name clickable
    assert.ok(rendered.includes(`<@${signups[0].userId}>`));
  });

  it('falls back to a plain mention for players who never registered', () => {
    const signups = makeSignups(4);
    const profiles = makeProfiles(signups);
    profiles.delete(signups[0].userId);

    const embed = createGuildWarEmbed(makeEvent(), signups, en, {
      notifyLeadMin: 60,
      profiles,
    }).toJSON();

    const rendered = JSON.stringify(embed);

    assert.ok(rendered.includes(`<@${signups[0].userId}>`));
    assert.ok(!rendered.includes('TieuLongNu0'), 'deleted profile should not appear');
    assert.ok(rendered.includes('TieuLongNu1'), 'other profiles still appear');
  });

  it('drops detail rather than overrunning the field limit at full size', () => {
    const signups = makeSignups(30);
    const profiles = makeProfiles(signups);

    for (const t of [en, vi]) {
      const embed = createGuildWarEmbed(makeEvent(), signups, t, {
        guildName: 'Bang Hoi Rat Dai Ten',
        notifyLeadMin: 60,
        profiles,
      }).toJSON();

      for (const field of embed.fields ?? []) {
        assert.ok(
          field.value.length <= 1024,
          `field "${field.name}" is ${field.value.length} chars`
        );
      }

      assert.ok(JSON.stringify(embed).length <= 6000);

      // Everyone is still listed, whatever detail level was chosen
      for (const signup of signups) {
        assert.ok(
          JSON.stringify(embed).includes(`<@${signup.userId}>`),
          'a player was dropped from the roster'
        );
      }
    }
  });

  it('keeps attendance marks alongside the profile details', () => {
    const signups = makeSignups(4);
    signups[0].attendance = 'confirmed';

    const embed = createGuildWarEmbed(
      makeEvent({ notifiedAt: new Date(), status: 'locked' }),
      signups,
      en,
      { notifyLeadMin: 60, profiles: makeProfiles(signups) }
    ).toJSON();

    const roster = (embed.fields ?? []).map((f) => f.value).join('\n');

    assert.ok(/TieuLongNu0.*/.test(roster));
    assert.ok(roster.includes('✅'), 'attendance mark is missing');
  });

  it('leads with the in-game name in the text roster', () => {
    const signups = makeSignups(2);

    const roster = buildGuildWarRosterText(makeEvent(), signups, en, {
      profiles: makeProfiles(signups),
    });

    assert.ok(roster.includes('TieuLongNu0 (NguoiChoiTenRatDai0)'));
    assert.ok(!roster.includes('<@'), 'the text roster must not ping anyone');
  });
});
