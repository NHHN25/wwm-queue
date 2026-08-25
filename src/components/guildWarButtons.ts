import {
  ButtonInteraction,
  Client,
  StringSelectMenuInteraction,
  TextChannel,
} from 'discord.js';
import { GuildWarEvent } from '../models/GuildWarEvent.js';
import * as db from '../database/database.js';
import { getGuildTranslations } from '../localization/index.js';
import { ROLE_CONFIGS } from '../utils/constants.js';
import {
  GW_IDS,
  getSideName,
  parseGuildWarId,
} from '../utils/guildWarConstants.js';
import {
  createGuildWarButtons,
  createGuildWarEmbed,
  createGuildWarSelectComponents,
} from '../utils/guildWarEmbeds.js';
import type { GuildWarSide, PlayerRole } from '../types/index.js';

/**
 * Pending team/role choices, keyed by user and event.
 *
 * Discord select menus report each choice separately, so the two halves are
 * held here until the player presses Confirm. Lost on restart, which is fine:
 * the pickers are pre-filled from the player's saved signup anyway.
 */
const pendingSelections = new Map<
  string,
  { team?: GuildWarSide; role?: PlayerRole; timestamp: number }
>();

const SELECTION_TTL_MS = 15 * 60 * 1000;

function selectionKey(userId: string, eventId: number): string {
  return `${userId}:${eventId}`;
}

/**
 * Drop selections older than the interaction token lifetime
 */
function pruneSelections(): void {
  const cutoff = Date.now() - SELECTION_TTL_MS;

  for (const [key, value] of pendingSelections) {
    if (value.timestamp < cutoff) {
      pendingSelections.delete(key);
    }
  }
}

/**
 * Custom side labels configured for a guild
 */
function getSideNames(guildId: string): { offense: string | null; defense: string | null } {
  const settings = db.getGuildWarSettings(guildId);

  return {
    offense: settings?.team_offense_name ?? null,
    defense: settings?.team_defense_name ?? null,
  };
}

/**
 * Re-render an event's registration message.
 *
 * Called after every roster change so all viewers see the current state,
 * mirroring the two-update pattern used by the older queue system.
 */
export async function refreshGuildWarMessage(
  client: Client,
  event: GuildWarEvent
): Promise<void> {
  const messageId = event.getMessageId();

  if (!messageId) {
    return;
  }

  const guildId = event.getGuildId();
  const t = getGuildTranslations(guildId);
  const settings = db.getOrCreateGuildWarSettings(guildId);

  try {
    const channel = await client.channels.fetch(event.getChannelId());

    if (!channel?.isTextBased()) {
      return;
    }

    const message = await (channel as TextChannel).messages.fetch(messageId);
    const guild = client.guilds.cache.get(guildId);

    const embed = createGuildWarEmbed(event.getData(), event.getSignups(), t, {
      guildName: guild?.name,
      sideNames: getSideNames(guildId),
      notifyLeadMin: settings.notify_lead_min,
    });

    await message.edit({
      embeds: [embed],
      components: [createGuildWarButtons(event.getId(), t, !event.isOpen())],
    });
  } catch (error) {
    console.error(`[GuildWar] Failed to refresh message ${messageId}:`, error);
  }
}

/**
 * Route a Guild War button click.
 * Returns false when the id belongs to some other feature.
 */
export async function handleGuildWarButton(
  interaction: ButtonInteraction
): Promise<boolean> {
  const parsed = parseGuildWarId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const { action, eventId } = parsed;

  switch (action) {
    case GW_IDS.REGISTER:
      await handleRegisterButton(interaction, eventId);
      return true;
    case GW_IDS.WITHDRAW:
      await handleWithdrawButton(interaction, eventId);
      return true;
    case GW_IDS.SUBMIT:
      await handleSubmitButton(interaction, eventId);
      return true;
    case GW_IDS.CONFIRM:
      await handleAttendanceButton(interaction, eventId, 'confirmed');
      return true;
    case GW_IDS.DECLINE:
      await handleAttendanceButton(interaction, eventId, 'declined');
      return true;
    default:
      return false;
  }
}

/**
 * Route a Guild War select menu change.
 * Returns false when the id belongs to some other feature.
 */
export async function handleGuildWarSelect(
  interaction: StringSelectMenuInteraction
): Promise<boolean> {
  const parsed = parseGuildWarId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const { action, eventId } = parsed;

  if (action !== GW_IDS.TEAM_SELECT && action !== GW_IDS.ROLE_SELECT) {
    return false;
  }

  pruneSelections();

  const key = selectionKey(interaction.user.id, eventId);
  const current = pendingSelections.get(key) ?? { timestamp: Date.now() };

  if (action === GW_IDS.TEAM_SELECT) {
    current.team = interaction.values[0] as GuildWarSide;
  } else {
    current.role = interaction.values[0] as PlayerRole;
  }

  current.timestamp = Date.now();
  pendingSelections.set(key, current);

  await interaction.deferUpdate();
  return true;
}

/**
 * Register button: show the ephemeral team/role pickers
 */
async function handleRegisterButton(
  interaction: ButtonInteraction,
  eventId: number
): Promise<void> {
  const guildId = interaction.guildId ?? '';
  const t = getGuildTranslations(guildId);
  const event = GuildWarEvent.load(eventId);

  if (!event) {
    await interaction.reply({
      content: t.guildWarEvent.errorEventNotFound,
      ephemeral: true,
    });
    return;
  }

  if (!event.isOpen()) {
    await interaction.reply({
      content: t.guildWarEvent.errorEventLocked,
      ephemeral: true,
    });
    return;
  }

  const existing = event.getSignup(interaction.user.id);

  if (!existing && event.isFull()) {
    await interaction.reply({
      content: t.guildWarEvent.errorEventFull(event.getCapacity()),
      ephemeral: true,
    });
    return;
  }

  // Seed the picker with whatever the player already chose
  pendingSelections.set(selectionKey(interaction.user.id, eventId), {
    team: existing?.team,
    role: existing?.role,
    timestamp: Date.now(),
  });

  await interaction.reply({
    components: createGuildWarSelectComponents(eventId, t, {
      sideNames: getSideNames(guildId),
      currentTeam: existing?.team ?? null,
      currentRole: existing?.role ?? null,
    }),
    ephemeral: true,
  });
}

/**
 * Confirm button inside the ephemeral picker: write the signup
 */
async function handleSubmitButton(
  interaction: ButtonInteraction,
  eventId: number
): Promise<void> {
  const guildId = interaction.guildId ?? '';
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;

  const event = GuildWarEvent.load(eventId);

  if (!event) {
    await interaction.update({ content: gw.errorEventNotFound, components: [] });
    return;
  }

  const key = selectionKey(interaction.user.id, eventId);
  const selection = pendingSelections.get(key);
  const existing = event.getSignup(interaction.user.id);

  // Fall back to the saved signup for whichever half was not touched
  const team = selection?.team ?? existing?.team;
  const role = selection?.role ?? existing?.role;

  if (!team || !role) {
    await interaction.reply({ content: gw.errorSelectBoth, ephemeral: true });
    return;
  }

  const result = event.register(interaction.user.id, interaction.user.username, team, role);

  if (!result.ok) {
    const message =
      result.reason === 'full' ? gw.errorEventFull(event.getCapacity()) : gw.errorEventLocked;

    await interaction.update({ content: message, components: [] });
    return;
  }

  pendingSelections.delete(key);

  const sideName = getSideName(team, t, getSideNames(guildId));
  const roleName = ROLE_CONFIGS[role].displayName;

  await interaction.update({
    content: result.updated
      ? gw.registrationUpdated(sideName, roleName)
      : gw.registered(sideName, roleName),
    components: [],
  });

  await refreshGuildWarMessage(interaction.client, event);
}

/**
 * Withdraw button on the registration embed
 */
async function handleWithdrawButton(
  interaction: ButtonInteraction,
  eventId: number
): Promise<void> {
  const t = getGuildTranslations(interaction.guildId ?? '');
  const gw = t.guildWarEvent;

  const event = GuildWarEvent.load(eventId);

  if (!event) {
    await interaction.reply({ content: gw.errorEventNotFound, ephemeral: true });
    return;
  }

  if (!event.isOpen()) {
    await interaction.reply({ content: gw.errorEventLocked, ephemeral: true });
    return;
  }

  const removed = event.withdraw(interaction.user.id);

  if (!removed) {
    await interaction.reply({ content: gw.errorNotSignedUp, ephemeral: true });
    return;
  }

  await interaction.reply({ content: gw.withdrawn, ephemeral: true });
  await refreshGuildWarMessage(interaction.client, event);
}

/**
 * ✅ / ❌ on a reminder ping.
 *
 * Declining frees the slot for anyone still watching, but keeps the row so the
 * roster shows who dropped out rather than silently shrinking.
 */
async function handleAttendanceButton(
  interaction: ButtonInteraction,
  eventId: number,
  attendance: 'confirmed' | 'declined'
): Promise<void> {
  const t = getGuildTranslations(interaction.guildId ?? '');
  const gw = t.guildWarEvent;

  const event = GuildWarEvent.load(eventId);

  if (!event) {
    await interaction.reply({ content: gw.errorEventNotFound, ephemeral: true });
    return;
  }

  const updated = event.setAttendance(interaction.user.id, attendance);

  if (!updated) {
    await interaction.reply({ content: gw.errorNotSignedUp, ephemeral: true });
    return;
  }

  await interaction.reply({
    content: attendance === 'confirmed' ? gw.attendanceConfirmed : gw.attendanceDeclined,
    ephemeral: true,
  });

  await refreshGuildWarMessage(interaction.client, event);
}

/**
 * Exposed for tests: clear cached pickers
 */
export function clearGuildWarSelections(): void {
  pendingSelections.clear();
}
