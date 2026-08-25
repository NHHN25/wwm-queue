import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';
import { GuildWarEvent } from '../models/GuildWarEvent.js';
import * as db from '../database/database.js';
import { getGuildTranslations } from '../localization/index.js';
import { ROLE_CONFIGS } from '../utils/constants.js';
import {
  GUILD_WAR_COLORS,
  GUILD_WAR_SIDES,
  GUILD_WAR_SIDE_ORDER,
  GW_IDS,
  buildGuildWarId,
  getDayName,
  getSideName,
  parseGuildWarId,
} from '../utils/guildWarConstants.js';
import { refreshGuildWarMessage } from './guildWarButtons.js';
import type { GuildWarSide } from '../types/index.js';
import type { Translations } from '../localization/types.js';

/**
 * Admin team organizer.
 *
 * An ephemeral panel for hand-sorting the roster: pick a player, send them to
 * either side, remove them, or auto-balance and then tweak. Admin moves are
 * allowed even past capacity and after registration locks, because organizing
 * normally happens once the roster is final.
 */

/**
 * Which player each admin currently has selected, keyed by admin and event
 */
const selectedPlayers = new Map<string, string>();

function selectionKey(adminId: string, eventId: number): string {
  return `${adminId}:${eventId}`;
}

function getSideNames(guildId: string): { offense: string | null; defense: string | null } {
  const settings = db.getGuildWarSettings(guildId);

  return {
    offense: settings?.team_offense_name ?? null,
    defense: settings?.team_defense_name ?? null,
  };
}

/**
 * Roster view for the organizer panel.
 * Shows cached usernames rather than mentions so nobody gets pinged while an
 * admin shuffles the teams.
 */
export function createOrganizerEmbed(
  event: GuildWarEvent,
  t: Translations,
  selectedUserId?: string
): EmbedBuilder {
  const gw = t.guildWarEvent;
  const guildId = event.getGuildId();
  const sideNames = getSideNames(guildId);
  const grouped = event.getSignupsBySide();

  const embed = new EmbedBuilder()
    .setTitle(gw.organizerTitle(getDayName(event.getDay(), t)))
    .setColor(GUILD_WAR_COLORS.OPEN)
    .setDescription(gw.signupCount(event.getSignupCount(), event.getCapacity()));

  for (const side of GUILD_WAR_SIDE_ORDER) {
    const members = grouped[side];
    const sideName = getSideName(side, t, sideNames);

    const lines =
      members.length > 0
        ? members
            .map((member) => {
              const marker = member.userId === selectedUserId ? '▸ ' : '';
              const moved = member.assignedBy ? ' ·' : '';
              return `${marker}${ROLE_CONFIGS[member.role].emoji} ${member.username}${moved}`;
            })
            .join('\n')
        : gw.noSignups;

    embed.addFields({
      name: gw.teamHeader(GUILD_WAR_SIDES[side].emoji, sideName, members.length),
      value: lines,
      inline: true,
    });
  }

  const counts = event.getAttendanceCounts();

  if (event.getData().notifiedAt) {
    embed.addFields({
      name: '​',
      value: gw.attendanceSummary(counts.confirmed, counts.declined, counts.pending),
    });
  }

  return embed;
}

/**
 * Controls for the organizer panel
 */
export function createOrganizerComponents(
  event: GuildWarEvent,
  t: Translations
): Array<ActionRowBuilder<UserSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>> {
  const gw = t.guildWarEvent;
  const eventId = event.getId();
  const sideNames = getSideNames(event.getGuildId());

  // A user select rather than a string select: a 30-player roster would blow
  // past Discord's 25-option limit.
  const playerSelect = new UserSelectMenuBuilder()
    .setCustomId(buildGuildWarId(GW_IDS.ORG_PLAYER_SELECT, eventId))
    .setPlaceholder(gw.organizerSelectPlayer)
    .setMinValues(1)
    .setMaxValues(1);

  const moveRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.ORG_MOVE_OFFENSE, eventId))
      .setLabel(gw.organizerMoveTo(getSideName('offense', t, sideNames)))
      .setEmoji(GUILD_WAR_SIDES.offense.emoji)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.ORG_MOVE_DEFENSE, eventId))
      .setLabel(gw.organizerMoveTo(getSideName('defense', t, sideNames)))
      .setEmoji(GUILD_WAR_SIDES.defense.emoji)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.ORG_REMOVE, eventId))
      .setLabel(gw.organizerRemove)
      .setStyle(ButtonStyle.Secondary)
  );

  const toolRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.ORG_BALANCE, eventId))
      .setLabel(gw.organizerBalance)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildGuildWarId(GW_IDS.ORG_REFRESH, eventId))
      .setLabel(gw.organizerRefresh)
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(playerSelect),
    moveRow,
    toolRow,
  ];
}

/**
 * Redraw the organizer panel in place
 */
async function rerender(
  interaction: ButtonInteraction | UserSelectMenuInteraction,
  event: GuildWarEvent,
  t: Translations,
  content?: string
): Promise<void> {
  const selected = selectedPlayers.get(selectionKey(interaction.user.id, event.getId()));

  await interaction.update({
    content: content ?? '',
    embeds: [createOrganizerEmbed(event, t, selected)],
    components: createOrganizerComponents(event, t),
  });
}

/**
 * Player picker changed
 */
export async function handleOrganizerSelect(
  interaction: UserSelectMenuInteraction
): Promise<boolean> {
  const parsed = parseGuildWarId(interaction.customId);

  if (!parsed || parsed.action !== GW_IDS.ORG_PLAYER_SELECT) {
    return false;
  }

  const t = getGuildTranslations(interaction.guildId ?? '');
  const event = GuildWarEvent.load(parsed.eventId);

  if (!event) {
    await interaction.update({
      content: t.guildWarEvent.errorEventNotFound,
      embeds: [],
      components: [],
    });
    return true;
  }

  const userId = interaction.values[0];
  selectedPlayers.set(selectionKey(interaction.user.id, parsed.eventId), userId);

  const signup = event.getSignup(userId);

  await rerender(
    interaction,
    event,
    t,
    signup ? '' : t.guildWarEvent.organizerNotSignedUp
  );

  return true;
}

/**
 * Organizer buttons: move, remove, balance, refresh
 */
export async function handleOrganizerButton(
  interaction: ButtonInteraction
): Promise<boolean> {
  const parsed = parseGuildWarId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const organizerActions: string[] = [
    GW_IDS.ORG_MOVE_OFFENSE,
    GW_IDS.ORG_MOVE_DEFENSE,
    GW_IDS.ORG_REMOVE,
    GW_IDS.ORG_BALANCE,
    GW_IDS.ORG_REFRESH,
  ];

  if (!organizerActions.includes(parsed.action)) {
    return false;
  }

  const guildId = interaction.guildId ?? '';
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;
  const event = GuildWarEvent.load(parsed.eventId);

  if (!event) {
    await interaction.update({
      content: gw.errorEventNotFound,
      embeds: [],
      components: [],
    });
    return true;
  }

  const key = selectionKey(interaction.user.id, parsed.eventId);
  const selectedUserId = selectedPlayers.get(key);

  // Refresh and balance work on the whole roster, the rest need a selection
  const needsSelection =
    parsed.action === GW_IDS.ORG_MOVE_OFFENSE ||
    parsed.action === GW_IDS.ORG_MOVE_DEFENSE ||
    parsed.action === GW_IDS.ORG_REMOVE;

  if (needsSelection && !selectedUserId) {
    await interaction.reply({ content: gw.organizerNoPlayerSelected, ephemeral: true });
    return true;
  }

  let notice = '';

  switch (parsed.action) {
    case GW_IDS.ORG_MOVE_OFFENSE:
    case GW_IDS.ORG_MOVE_DEFENSE: {
      const side: GuildWarSide =
        parsed.action === GW_IDS.ORG_MOVE_OFFENSE ? 'offense' : 'defense';

      const signup = event.getSignup(selectedUserId as string);

      if (!signup) {
        await interaction.reply({ content: gw.organizerNotSignedUp, ephemeral: true });
        return true;
      }

      event.moveToTeam(selectedUserId as string, side, interaction.user.id);

      notice = gw.organizerMoved(
        signup.username,
        getSideName(side, t, getSideNames(guildId))
      );
      break;
    }

    case GW_IDS.ORG_REMOVE: {
      const signup = event.getSignup(selectedUserId as string);

      if (!signup) {
        await interaction.reply({ content: gw.organizerNotSignedUp, ephemeral: true });
        return true;
      }

      event.withdraw(selectedUserId as string);
      selectedPlayers.delete(key);
      notice = gw.organizerRemoved(signup.username);
      break;
    }

    case GW_IDS.ORG_BALANCE: {
      event.autoBalance(interaction.user.id);
      notice = gw.organizerBalanced;
      break;
    }

    default:
      // Refresh: no change, just redraw
      break;
  }

  await rerender(interaction, event, t, notice);

  // Keep the public registration embed in step with the organizer's changes
  await refreshGuildWarMessage(interaction.client, event);

  return true;
}

/**
 * Exposed for tests: forget which players admins have selected
 */
export function clearOrganizerSelections(): void {
  selectedPlayers.clear();
}
