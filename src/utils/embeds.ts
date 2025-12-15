import { EmbedBuilder } from 'discord.js';
import type { QueueState } from '../types/index.js';
import { formatPlayerSlot } from '../models/QueuePlayer.js';
import {
  QUEUE_CONFIGS,
  EMOJIS,
  EMBED_FOOTERS,
  getQueueEmoji,
  getQueueDisplayName,
} from './constants.js';

/**
 * Create queue embed
 * This is the main embed shown to users in Discord
 */
export function createQueueEmbed(
  state: QueueState,
  guildName?: string
): EmbedBuilder {
  const { queue } = state;
  const config = QUEUE_CONFIGS[queue.queueType];

  // Build title
  const emoji = getQueueEmoji(queue.queueType);
  const displayName = getQueueDisplayName(queue.queueType);
  const title = `${emoji} ${displayName} Queue`;

  // Build embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.color)
    .setTimestamp(new Date());

  // Add guild name if provided
  if (guildName) {
    embed.setAuthor({ name: guildName });
  }

  // Build description
  const description = buildQueueDescription(state);
  embed.setDescription(description);

  // Add footer based on queue state
  const footer = getFooterText(state);
  embed.setFooter({ text: footer });

  return embed;
}

/**
 * Build queue description with player slots
 */
function buildQueueDescription(state: QueueState): string {
  const { queue, players } = state;
  const playerCount = players.length;
  const capacity = queue.capacity;

  const lines: string[] = [];

  // Player count header
  lines.push(`**Players: ${playerCount}/${capacity}**`);
  lines.push('');

  // If queue is empty, show message
  if (playerCount === 0) {
    lines.push('*No players in queue yet.*');
    lines.push('*Click a role button below to join!*');
    return lines.join('\n');
  }

  // Show all slots (filled + empty)
  for (let i = 0; i < capacity; i++) {
    const player = players[i] || null;
    const slotText = formatPlayerSlot(player, i + 1);
    lines.push(slotText);
  }

  // If queue is full, add celebration message
  if (playerCount >= capacity) {
    lines.push('');
    lines.push(`${EMOJIS.FULL_QUEUE} **Queue is full!**`);
  }

  return lines.join('\n');
}

/**
 * Get footer text based on queue state
 */
function getFooterText(state: QueueState): string {
  const { players, queue } = state;

  if (players.length === 0) {
    return EMBED_FOOTERS.QUEUE_EMPTY;
  }

  if (players.length >= queue.capacity) {
    return EMBED_FOOTERS.QUEUE_FULL;
  }

  return EMBED_FOOTERS.QUEUE_ACTIVE;
}

/**
 * Create error embed for user-facing errors
 */
export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.ERROR} Error`)
    .setDescription(message)
    .setColor(0xed4245) // Red
    .setTimestamp(new Date());
}

/**
 * Create success embed for confirmations
 */
export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Success`)
    .setDescription(message)
    .setColor(0x57f287) // Green
    .setTimestamp(new Date());
}

/**
 * Create info embed for general information
 */
export function createInfoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.INFO} ${title}`)
    .setDescription(message)
    .setColor(0x5865f2) // Blue
    .setTimestamp(new Date());
}

/**
 * Create queue full notification embed
 * Used when sending followUp message to ping all players
 */
export function createQueueFullEmbed(state: QueueState): EmbedBuilder {
  const { queue, players } = state;
  const config = QUEUE_CONFIGS[queue.queueType];

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.PARTY} Queue Ready!`)
    .setDescription(
      `The **${config.displayName}** queue is now full with ${players.length} players!\n\nGet ready to start!`
    )
    .setColor(config.color)
    .setTimestamp(new Date())
    .setFooter({ text: 'Good luck and have fun!' });

  return embed;
}

/**
 * Create setup confirmation embed
 */
export function createSetupEmbed(
  queueType: 'sword_trial' | 'hero_realm',
  channelMention: string
): EmbedBuilder {
  const config = QUEUE_CONFIGS[queueType];

  return new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Queue Created`)
    .setDescription(
      `Successfully created **${config.displayName}** queue in ${channelMention}!\n\nPlayers can now join using the role buttons.`
    )
    .setColor(config.color)
    .setTimestamp(new Date());
}

/**
 * Create reset confirmation embed
 */
export function createResetEmbed(
  queueType: 'sword_trial' | 'hero_realm'
): EmbedBuilder {
  const config = QUEUE_CONFIGS[queueType];

  return new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Queue Reset`)
    .setDescription(
      `The **${config.displayName}** queue has been cleared.\n\nAll players have been removed from the queue.`
    )
    .setColor(config.color)
    .setTimestamp(new Date());
}

/**
 * Create close confirmation embed
 */
export function createCloseEmbed(
  queueType: 'sword_trial' | 'hero_realm'
): EmbedBuilder {
  const config = QUEUE_CONFIGS[queueType];

  return new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Queue Closed`)
    .setDescription(
      `The **${config.displayName}** queue has been closed and removed.`
    )
    .setColor(config.color)
    .setTimestamp(new Date());
}
