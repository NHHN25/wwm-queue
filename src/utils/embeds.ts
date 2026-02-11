import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { QueueState } from '../types/index.js';
import {
  QUEUE_CONFIGS,
  EMOJIS,
  COLORS,
  BUTTON_IDS,
  getQueueEmoji,
} from './constants.js';
import { getGuildTranslations } from '../localization/index.js';

/**
 * Create queue embed
 * This is the main embed shown to users in Discord
 */
export function createQueueEmbed(
  state: QueueState,
  guildName?: string,
  guildId?: string
): EmbedBuilder {
  const { queue, players } = state;
  const config = QUEUE_CONFIGS[queue.queueType];
  const playerCount = players.length;
  const isFull = playerCount >= queue.capacity;
  const isClosed = queue.status === 'closed';

  // Get translations for this guild
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  // Get queue type display name
  const displayName = queue.queueType === 'sword_trial'
    ? t.queueTypes.swordTrial
    : queue.queueType === 'guild_war'
    ? t.queueTypes.guildWar
    : t.queueTypes.heroRealm;

  // Build title with status indicator
  const emoji = getQueueEmoji(queue.queueType);
  let statusEmoji: string;
  let title: string;

  if (isClosed) {
    statusEmoji = EMOJIS.CLOSED;
    title = `${statusEmoji} ${emoji} ${displayName} - ${t.embeds.closed || 'Closed'}`;
  } else {
    statusEmoji = isFull ? '✅' : playerCount > 0 ? '⏳' : '🔵';
    title = `${statusEmoji} ${emoji} ${displayName}`;
  }

  // Determine embed color
  let embedColor: number;
  if (isClosed) {
    embedColor = COLORS.CLOSED;
  } else if (isFull) {
    embedColor = COLORS.SUCCESS;
  } else {
    embedColor = config.color;
  }

  // Build embed with enhanced styling
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(embedColor)
    .setTimestamp(new Date());

  // Add guild name with icon
  if (guildName) {
    embed.setAuthor({
      name: `${guildName} • ${t.embeds.partyFinder}`,
    });
  }

  // Build description
  const description = buildQueueDescription(state, t);
  embed.setDescription(description);

  // Add progress bar field
  const progressBar = createProgressBar(playerCount, queue.capacity, t);
  embed.addFields({
    name: t.embeds.queueProgress,
    value: progressBar,
    inline: false,
  });

  // Add footer based on queue state
  const footer = getFooterText(state, t);
  const footerIcon = isClosed ? EMOJIS.CLOSED : isFull ? '✅' : '👥';
  embed.setFooter({ text: `${footerIcon} ${footer}` });

  return embed;
}

/**
 * Build queue description with player slots
 */
function buildQueueDescription(state: QueueState, t: any): string {
  const { queue, players } = state;
  const playerCount = players.length;
  const capacity = queue.capacity;

  const lines: string[] = [];

  // Get queue-specific beTheFirst message
  const beTheFirstMessage = queue.queueType === 'guild_war'
    ? t.embeds.beTheFirstGuildWar
    : t.embeds.beTheFirst;

  // If queue is empty, show welcoming message
  if (playerCount === 0) {
    lines.push('```');
    lines.push('╔═══════════════════════════════╗');
    lines.push(`║     🎮 ${t.embeds.queueEmpty}    ║`);
    lines.push('╚═══════════════════════════════╝');
    lines.push('```');
    lines.push('');
    lines.push(`> ${beTheFirstMessage}`);
    lines.push(`> ${t.embeds.clickRole}`);
    return lines.join('\n');
  }

  // Header with visual separator
  lines.push('```');
  lines.push(`═══════════ ${t.embeds.partyRoster} ═══════════`);
  lines.push('```');
  lines.push('');

  // Show all slots with enhanced formatting (keep role names in English)
  for (let i = 0; i < capacity; i++) {
    const player = players[i] || null;
    if (player) {
      const roleEmoji = getRoleEmoji(player.role);
      const roleName = getRoleDisplayName(player.role).toUpperCase(); // Keep in English

      // Base player line
      let playerLine = `**${i + 1}.** ${roleEmoji} \`${roleName}\` • <@${player.userId}>`;

      // Add stats if available
      if (player.gearScore !== null && player.gearScore !== undefined) {
        const gearScoreDisplay = formatGearScoreAsGoose(player.gearScore);
        playerLine += ` • ${gearScoreDisplay}`;

        if (player.arenaRank && player.arenaRank.trim() !== '') {
          playerLine += ` • 🏆 ${player.arenaRank}`;
        }
      }

      lines.push(playerLine);
    } else {
      lines.push(`**${i + 1}.** ${EMOJIS.EMPTY_SLOT} \`${t.embeds.openSlot}\``);
    }
  }

  // If queue is full, add celebration message
  if (playerCount >= capacity) {
    lines.push('');
    lines.push('```diff');
    lines.push(`+ ${t.embeds.queueComplete} +`);
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Create a visual progress bar
 */
function createProgressBar(current: number, total: number, t: any): string {
  const percentage = Math.round((current / total) * 100);
  const filledBlocks = Math.round((current / total) * 10);
  const emptyBlocks = 10 - filledBlocks;

  const filled = '█'.repeat(filledBlocks);
  const empty = '░'.repeat(emptyBlocks);

  const statusText =
    current === 0
      ? t.embeds.empty
      : current === total
      ? t.embeds.full
      : `${current}/${total} ${t.embeds.players}`;

  return `\`${filled}${empty}\` **${percentage}%** • ${statusText}`;
}

/**
 * Get role emoji helper
 */
function getRoleEmoji(role: 'tank' | 'healer' | 'dps'): string {
  const emojis = {
    tank: '🛡️',
    healer: '💚',
    dps: '⚔️',
  };
  return emojis[role];
}

/**
 * Get role display name helper
 */
function getRoleDisplayName(role: 'tank' | 'healer' | 'dps'): string {
  const names = {
    tank: 'Tank',
    healer: 'Healer',
    dps: 'DPS',
  };
  return names[role];
}

/**
 * Get footer text based on queue state
 */
function getFooterText(state: QueueState, t: any): string {
  const { players, queue } = state;

  // If queue is closed, show closed message
  if (queue.status === 'closed') {
    return t.footers.queueClosed || 'Queue closed';
  }

  // Build base footer text
  let baseText: string;
  if (players.length === 0) {
    baseText = t.footers.queueEmpty;
  } else if (players.length >= queue.capacity) {
    baseText = t.footers.queueFull;
  } else {
    baseText = t.footers.queueActive;
  }

  // Add timer display if queue has an expiration time
  if (queue.expiresAt) {
    const timerText = formatTimerDisplay(queue.expiresAt, t);
    return `${baseText} • ${timerText}`;
  }

  return baseText;
}

/**
 * Format timer display using Discord timestamp
 * Shows auto-updating countdown using Discord's built-in relative timestamp
 */
function formatTimerDisplay(expiresAt: Date, t: any): string {
  const unixTimestamp = Math.floor(expiresAt.getTime() / 1000);
  const timerLabel = t.embeds.closes || 'Closes';
  // Discord relative timestamp format: <t:UNIX:R> shows "in X minutes"
  return `${EMOJIS.TIMER} ${timerLabel} <t:${unixTimestamp}:R>`;
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

/**
 * Formats gear score as Goose display
 * @param gearScore - Raw gear score integer from database (e.g., 18200, 6800)
 * @returns Formatted string like "1.82🦆" or "0.68🦆"
 */
export function formatGearScoreAsGoose(gearScore: number): string {
  const gooseValue = gearScore / 10000;

  // Format with up to 3 decimal places, removing trailing zeros
  const formatted = gooseValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: false  // Don't add thousands separator for values like 1.234
  });

  return `${formatted}🦆`;
}

/**
 * Create disabled buttons for closed queues
 * These buttons are shown but cannot be clicked
 */
export function createDisabledButtons(guildId?: string): ActionRowBuilder<ButtonBuilder> {
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  const tankButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_TANK)
    .setLabel(t.buttons.tank)
    .setEmoji('🛡️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const healerButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_HEALER)
    .setLabel(t.buttons.healer)
    .setEmoji('💚')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const dpsButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_DPS)
    .setLabel(t.buttons.dps)
    .setEmoji('⚔️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    tankButton,
    healerButton,
    dpsButton
  );
}
