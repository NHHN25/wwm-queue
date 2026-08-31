import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type {
  GuildWarEvent as GuildWarEventData,
  GuildWarProfile,
  GuildWarSide,
  GuildWarSignup,
  PlayerRole,
} from '../types/index.js';
import type { Translations } from '../localization/types.js';
import { ROLE_CONFIGS } from './constants.js';
import { WEAPON_CONFIGS } from './weaponConstants.js';
import {
  GUILD_WAR_COLORS,
  GUILD_WAR_SIDES,
  GUILD_WAR_SIDE_ORDER,
  GW_IDS,
  buildGuildWarId,
  getDayName,
  getSideName,
} from './guildWarConstants.js';
import { discordTimestamp } from './guildWarTime.js';

/**
 * Custom side labels for a guild, as stored in guild_war_settings
 */
export interface SideNames {
  offense?: string | null;
  defense?: string | null;
}

const ROLE_ORDER: PlayerRole[] = ['tank', 'healer', 'dps'];

/**
 * Attendance marker shown next to a name once the reminder has gone out
 */
function attendanceMark(signup: GuildWarSignup): string {
  if (signup.attendance === 'confirmed') {
    return ' ✅';
  }

  if (signup.attendance === 'declined') {
    return ' ❌';
  }

  return '';
}

/**
 * Registrations keyed by Discord user id, as filled in through /baodanh
 */
export type ProfileMap = Map<string, GuildWarProfile>;

/**
 * How much of a player's profile fits on a roster line.
 *
 * Weapon emojis are custom Discord emojis, which cost around 40 characters
 * each in the payload. At a full roster that overruns the 1024-character limit
 * on an embed field, so the roster drops one detail at a time rather than
 * letting Discord truncate it.
 */
type RosterDetail = 'full' | 'weapons' | 'name' | 'plain';

const ROSTER_DETAIL_ORDER: RosterDetail[] = ['full', 'weapons', 'name', 'plain'];

const EMBED_FIELD_LIMIT = 1024;

/**
 * Discord rejects an empty field name or value, so a blank column is a
 * zero-width space. Used to pad a row out to three inline fields.
 */
const ZERO_WIDTH = '​';

const SPACER_FIELD = { name: ZERO_WIDTH, value: ZERO_WIDTH, inline: true };

/**
 * Weapon emojis for a profile, primary then secondary
 */
function weaponEmojis(profile: GuildWarProfile): string {
  const primary = WEAPON_CONFIGS[profile.primaryWeapon]?.emoji ?? '';
  const secondary = WEAPON_CONFIGS[profile.secondaryWeapon]?.emoji ?? '';

  return [primary, secondary].filter(Boolean).join('');
}

/**
 * One roster line: role emoji, mention, and as much of the player's
 * registration as the current detail level allows.
 */
function formatSignupLine(
  signup: GuildWarSignup,
  showAttendance: boolean,
  profile?: GuildWarProfile,
  detail: RosterDetail = 'full'
): string {
  const role = ROLE_CONFIGS[signup.role];
  const mark = showAttendance ? attendanceMark(signup) : '';
  const parts = [role.emoji, `<@${signup.userId}>`];

  if (profile && detail !== 'plain') {
    if ((detail === 'full' || detail === 'name') && profile.ingameName) {
      parts.push(`· ${profile.ingameName}`);
    }

    if (detail === 'full' || detail === 'weapons') {
      const emojis = weaponEmojis(profile);

      if (emojis) {
        parts.push(emojis);
      }
    }
  }

  return `${parts.join(' ')}${mark}`;
}

/**
 * Render both sides at the richest detail level that fits every field
 */
function renderRosters(
  grouped: Record<GuildWarSide, GuildWarSignup[]>,
  showAttendance: boolean,
  profiles: ProfileMap | undefined,
  emptyText: string
): Record<GuildWarSide, string> {
  let rendered: Record<GuildWarSide, string> = { offense: emptyText, defense: emptyText };

  for (const detail of ROSTER_DETAIL_ORDER) {
    rendered = { offense: emptyText, defense: emptyText };

    let fits = true;

    for (const side of GUILD_WAR_SIDE_ORDER) {
      const members = grouped[side];

      if (members.length === 0) {
        continue;
      }

      const text = members
        .map((member) =>
          formatSignupLine(member, showAttendance, profiles?.get(member.userId), detail)
        )
        .join('\n');

      if (text.length > EMBED_FIELD_LIMIT) {
        fits = false;
        break;
      }

      rendered[side] = text;
    }

    // Both sides fit, so this is the richest level available
    if (fits) {
      return rendered;
    }
  }

  return rendered;
}

/**
 * Registration embed posted in the registration channel.
 *
 * One embed per event, so Saturday and Sunday each get their own message with
 * their own roster and their own buttons.
 */
export function createGuildWarEmbed(
  event: GuildWarEventData,
  signups: GuildWarSignup[],
  t: Translations,
  options: {
    guildName?: string;
    sideNames?: SideNames;
    notifyLeadMin: number;
    profiles?: ProfileMap;
  }
): EmbedBuilder {
  const gw = t.guildWarEvent;
  const dayName = getDayName(event.day, t);

  const statusLabel =
    event.status === 'open'
      ? gw.statusOpen
      : event.status === 'locked'
        ? gw.statusLocked
        : event.status === 'done'
          ? gw.statusDone
          : gw.statusCancelled;

  const color =
    event.status === 'open'
      ? GUILD_WAR_COLORS.OPEN
      : event.status === 'locked'
        ? GUILD_WAR_COLORS.LOCKED
        : GUILD_WAR_COLORS.DONE;

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${gw.embedTitle} — ${dayName}`)
    .setColor(color)
    .setDescription(statusLabel);

  if (options.guildName) {
    embed.setAuthor({ name: options.guildName });
  }

  embed.addFields(
    {
      name: gw.fieldWhen,
      value: `${discordTimestamp(event.eventAt, 'F')}\n${discordTimestamp(event.eventAt, 'R')}`,
      inline: true,
    },
    {
      name: gw.fieldSignups,
      value: gw.signupCount(signups.length, event.capacity),
      inline: true,
    }
  );

  // Discord lays inline fields out three to a row. The header must fill a whole
  // row on its own, otherwise the first team column is pulled up into it and
  // the second team drops onto a row by itself.
  if (event.status === 'open') {
    embed.addFields({
      name: gw.fieldReminder,
      value: gw.reminderValue(discordTimestamp(event.notifyAt, 't'), options.notifyLeadMin),
      inline: true,
    });
  } else {
    embed.addFields(SPACER_FIELD);
  }

  // Attendance only becomes meaningful once the reminder has been sent
  const showAttendance = event.notifiedAt !== null;

  if (signups.length === 0) {
    embed.addFields({ name: ZERO_WIDTH, value: gw.noSignups });
  } else {
    const grouped: Record<GuildWarSide, GuildWarSignup[]> = { offense: [], defense: [] };

    for (const signup of signups) {
      grouped[signup.team].push(signup);
    }

    const rendered = renderRosters(grouped, showAttendance, options.profiles, gw.noSignups);

    for (const side of GUILD_WAR_SIDE_ORDER) {
      const members = grouped[side];
      const sideName = getSideName(side, t, options.sideNames);

      embed.addFields({
        name: gw.teamHeader(GUILD_WAR_SIDES[side].emoji, sideName, members.length),
        value: rendered[side],
        inline: true,
      });
    }
  }

  if (showAttendance) {
    const counts = signups.reduce(
      (acc, s) => {
        if (s.attendance === 'confirmed') {
          acc.confirmed++;
        } else if (s.attendance === 'declined') {
          acc.declined++;
        } else {
          acc.pending++;
        }
        return acc;
      },
      { confirmed: 0, declined: 0, pending: 0 }
    );

    embed.addFields({
      name: ZERO_WIDTH,
      value: gw.attendanceSummary(counts.confirmed, counts.declined, counts.pending),
    });
  }

  embed.setFooter({
    text: event.status === 'open' ? gw.footerOpen : gw.footerLocked,
  });

  return embed;
}

/**
 * Register / Withdraw buttons under the registration embed
 */
export function createGuildWarButtons(
  eventId: number,
  t: Translations,
  disabled = false
): ActionRowBuilder<ButtonBuilder> {
  const gw = t.guildWarEvent;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.REGISTER, eventId))
      .setLabel(gw.registerButton)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.WITHDRAW, eventId))
      .setLabel(gw.withdrawButton)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

/**
 * Ephemeral team + role pickers shown after clicking Register.
 *
 * Current values are pre-selected so a returning player sees what they picked
 * last time instead of an empty menu.
 */
export function createGuildWarSelectComponents(
  eventId: number,
  t: Translations,
  options: {
    sideNames?: SideNames;
    currentTeam?: GuildWarSide | null;
    currentRole?: PlayerRole | null;
  } = {}
): Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>> {
  const gw = t.guildWarEvent;

  const teamSelect = new StringSelectMenuBuilder()
    .setCustomId(buildGuildWarId(GW_IDS.TEAM_SELECT, eventId))
    .setPlaceholder(gw.selectTeamPlaceholder)
    .addOptions(
      GUILD_WAR_SIDE_ORDER.map((side) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(getSideName(side, t, options.sideNames))
          .setEmoji(GUILD_WAR_SIDES[side].emoji)
          .setValue(side)
          .setDefault(options.currentTeam === side)
      )
    );

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId(buildGuildWarId(GW_IDS.ROLE_SELECT, eventId))
    .setPlaceholder(gw.selectRolePlaceholder)
    .addOptions(
      ROLE_ORDER.map((role) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(ROLE_CONFIGS[role].displayName)
          .setEmoji(ROLE_CONFIGS[role].emoji)
          .setValue(role)
          .setDefault(options.currentRole === role)
      )
    );

  const submit = new ButtonBuilder()
    .setCustomId(buildGuildWarId(GW_IDS.SUBMIT, eventId))
    .setLabel(gw.submitButton)
    .setStyle(ButtonStyle.Success);

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(teamSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleSelect),
    new ActionRowBuilder<ButtonBuilder>().addComponents(submit),
  ];
}

/**
 * ✅ / ❌ buttons attached to reminder pings. Emoji only, no labels.
 */
export function createAttendanceButtons(
  eventId: number
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.CONFIRM, eventId))
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.DECLINE, eventId))
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * A message the scheduler is about to send: text plus who it may mention
 */
export interface GuildWarPingMessage {
  content: string;
  userIds: string[];
}

/**
 * Build the T-minus reminder, one message per side.
 *
 * Split per side because that is how the guild actually organizes, and because
 * a 30-mention block is easier to read broken in two.
 */
export function buildGuildWarPingMessages(
  event: GuildWarEventData,
  signups: GuildWarSignup[],
  t: Translations,
  options: { sideNames?: SideNames } = {}
): GuildWarPingMessage[] {
  const gw = t.guildWarEvent;
  const dayName = getDayName(event.day, t);
  const messages: GuildWarPingMessage[] = [];

  const grouped: Record<GuildWarSide, GuildWarSignup[]> = { offense: [], defense: [] };

  for (const signup of signups) {
    grouped[signup.team].push(signup);
  }

  const header = gw.pingHeader(dayName, discordTimestamp(event.eventAt, 'R'));

  GUILD_WAR_SIDE_ORDER.forEach((side, index) => {
    const members = grouped[side];

    if (members.length === 0) {
      return;
    }

    const sideName = getSideName(side, t, options.sideNames);
    const lines: string[] = [];

    // Only the first message repeats the event header
    if (index === 0 || messages.length === 0) {
      lines.push(header, '');
    }

    lines.push(gw.pingTeamHeader(GUILD_WAR_SIDES[side].emoji, sideName, members.length));

    for (const role of ROLE_ORDER) {
      const inRole = members.filter((m) => m.role === role);

      if (inRole.length === 0) {
        continue;
      }

      const mentions = inRole.map((m) => `<@${m.userId}>`).join(' ');
      lines.push(`${ROLE_CONFIGS[role].emoji} ${ROLE_CONFIGS[role].displayName}: ${mentions}`);
    }

    lines.push('', gw.pingFooter);

    messages.push({
      content: lines.join('\n'),
      userIds: members.map((m) => m.userId),
    });
  });

  return messages;
}

/**
 * Build the follow-up nudge aimed only at players who never answered
 */
export function buildGuildWarNudgeMessage(
  event: GuildWarEventData,
  unconfirmed: GuildWarSignup[],
  t: Translations,
  nudgeLeadMin: number
): GuildWarPingMessage | null {
  if (unconfirmed.length === 0) {
    return null;
  }

  const gw = t.guildWarEvent;
  const mentions = unconfirmed.map((s) => `<@${s.userId}>`).join(' ');

  const content = [
    gw.nudgeHeader(nudgeLeadMin, discordTimestamp(event.eventAt, 'R')),
    '',
    mentions,
    '',
    gw.nudgeFooter,
  ].join('\n');

  return {
    content,
    userIds: unconfirmed.map((s) => s.userId),
  };
}

/**
 * Plain-text roster, for copying into game chat
 */
export function buildGuildWarRosterText(
  event: GuildWarEventData,
  signups: GuildWarSignup[],
  t: Translations,
  options: { sideNames?: SideNames; profiles?: ProfileMap } = {}
): string {
  const gw = t.guildWarEvent;
  const dayName = getDayName(event.day, t);
  const lines: string[] = [gw.rosterTitle(dayName), ''];

  const grouped: Record<GuildWarSide, GuildWarSignup[]> = { offense: [], defense: [] };

  for (const signup of signups) {
    grouped[signup.team].push(signup);
  }

  for (const side of GUILD_WAR_SIDE_ORDER) {
    const members = grouped[side];
    const sideName = getSideName(side, t, options.sideNames);

    lines.push(gw.teamHeader(GUILD_WAR_SIDES[side].emoji, sideName, members.length));

    if (members.length === 0) {
      lines.push(gw.noSignups);
    } else {
      for (const member of members) {
        const mark = event.notifiedAt ? attendanceMark(member) : '';
        const profile = options.profiles?.get(member.userId);

        // The in-game name is what gets typed into game chat, so lead with it
        const name = profile?.ingameName
          ? `${profile.ingameName} (${member.username})`
          : member.username;

        lines.push(`${ROLE_CONFIGS[member.role].emoji} ${name}${mark}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}
