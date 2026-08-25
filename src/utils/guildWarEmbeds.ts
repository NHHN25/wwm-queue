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
  GuildWarSide,
  GuildWarSignup,
  PlayerRole,
} from '../types/index.js';
import type { Translations } from '../localization/types.js';
import { ROLE_CONFIGS } from './constants.js';
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
 * One roster line: role emoji, mention, attendance marker
 */
function formatSignupLine(signup: GuildWarSignup, showAttendance: boolean): string {
  const role = ROLE_CONFIGS[signup.role];
  const mark = showAttendance ? attendanceMark(signup) : '';

  return `${role.emoji} <@${signup.userId}>${mark}`;
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

  // Reminder line is only useful while the ping is still ahead of us
  if (event.status === 'open') {
    embed.addFields({
      name: gw.fieldReminder,
      value: gw.reminderValue(discordTimestamp(event.notifyAt, 't'), options.notifyLeadMin),
      inline: true,
    });
  }

  // Attendance only becomes meaningful once the reminder has been sent
  const showAttendance = event.notifiedAt !== null;

  if (signups.length === 0) {
    embed.addFields({ name: '​', value: gw.noSignups });
  } else {
    const grouped: Record<GuildWarSide, GuildWarSignup[]> = { offense: [], defense: [] };

    for (const signup of signups) {
      grouped[signup.team].push(signup);
    }

    for (const side of GUILD_WAR_SIDE_ORDER) {
      const members = grouped[side];
      const sideName = getSideName(side, t, options.sideNames);

      const lines =
        members.length > 0
          ? members.map((s) => formatSignupLine(s, showAttendance)).join('\n')
          : gw.noSignups;

      embed.addFields({
        name: gw.teamHeader(GUILD_WAR_SIDES[side].emoji, sideName, members.length),
        value: lines,
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
      name: '​',
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
  options: { sideNames?: SideNames } = {}
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
        lines.push(`${ROLE_CONFIGS[member.role].emoji} ${member.username}${mark}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}
