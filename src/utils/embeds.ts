import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { QueueState, QueueType } from '../types/index.js';
import {
  QUEUE_CONFIGS,
  TEAM_CONFIGS,
  EMOJIS,
  COLORS,
  BUTTON_IDS,
  getQueueEmoji,
} from './constants.js';
import { getWeaponWithEmoji } from './weaponConstants.js';
import { getGuildTranslations } from '../localization/index.js';
import { groupPlayersByTeam } from '../models/QueuePlayer.js';

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
  const description = buildQueueDescription(state, t) + '\n\n_made by RaZe, Phong Ảnh Sát Guild_';
  embed.setDescription(description);

  // Add progress bar field
  let progressBar = createProgressBar(playerCount, queue.capacity, t);
  
  if (queue.expiresAt && !isClosed && !isFull) {
    const unixTimestamp = Math.floor(queue.expiresAt.getTime() / 1000);
    const timerLabel = t.embeds.closes || 'Closes';
    progressBar += `\n${EMOJIS.TIMER} **${timerLabel}**: <t:${unixTimestamp}:R>`;
  }

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

  if (queue.queueType === 'guild_war') {
    const grouped = groupPlayersByTeam(players);
    const teams: Array<'jungler' | 'offense' | 'defense'> = ['jungler', 'offense', 'defense'];
    let index = 1;
    
    for (const team of teams) {
      const teamPlayers = grouped[team];
      const teamConfig = TEAM_CONFIGS[team];
      const teamDisplayName = t.guildWar ? 
        (team === 'jungler' ? t.guildWar.teamJungler : 
         team === 'offense' ? t.guildWar.teamOffense : 
         t.guildWar.teamDefense) : teamConfig.displayNameEn;
      
      lines.push(`**${teamConfig.emoji} ${teamDisplayName} (${teamPlayers.length})**`);
      
      if (teamPlayers.length === 0) {
        lines.push(`> *${t.embeds.empty}*`);
      } else {
        for (const player of teamPlayers) {
          lines.push(formatPlayerLine(player, index));
          index++;
        }
      }
      lines.push(''); // Empty line between teams
    }
  } else {
    // Show all slots with enhanced formatting (keep role names in English)
    for (let i = 0; i < capacity; i++) {
      const player = players[i] || null;
      if (player) {
        lines.push(formatPlayerLine(player, i + 1));
      } else {
        lines.push(`**${i + 1}.** ${EMOJIS.EMPTY_SLOT} \`${t.embeds.openSlot}\``);
      }
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
 * Format a single player line with stats
 */
function formatPlayerLine(player: any, index: number): string {
  const roleEmoji = getRoleEmoji(player.role);
  const roleName = getRoleDisplayName(player.role).toUpperCase(); // Keep in English

  // Base player line
  let playerLine = `**${index}.** ${roleEmoji} \`${roleName}\` • <@${player.userId}>`;

  // Add stats if available
  if (player.gearScore !== null && player.gearScore !== undefined) {
    if (player.primaryWeapon || player.secondaryWeapon) {
      playerLine += ` •`;
      if (player.primaryWeapon) {
        const primaryEmoji = getWeaponWithEmoji(player.primaryWeapon, 'en').split(' ')[0];
        playerLine += ` ${primaryEmoji}`;
      }
      if (player.secondaryWeapon) {
        const secondaryEmoji = getWeaponWithEmoji(player.secondaryWeapon, 'en').split(' ')[0];
        playerLine += `${secondaryEmoji}`;
      }
    }

    const gearScoreDisplay = formatGearScoreAsGoose(player.gearScore);
    playerLine += ` • ${gearScoreDisplay}`;

    if (player.arenaRank && player.arenaRank.trim() !== '') {
      playerLine += ` • 🏆 ${player.arenaRank}`;
    }
  }

  return playerLine;
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

  return baseText;
}

/**
 * Create panel embed
 * The persistent embed posted by /setup that contains the "Create Queue" button
 */
export function createPanelEmbed(
  queueType: QueueType,
  guildName?: string,
  guildId?: string
): EmbedBuilder {
  const config = QUEUE_CONFIGS[queueType];
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  const displayName = queueType === 'sword_trial'
    ? t.queueTypes.swordTrial
    : queueType === 'hero_realm'
    ? t.queueTypes.heroRealm
    : t.queueTypes.guildWar;

  const embed = new EmbedBuilder()
    .setTitle(`${config.emoji} ${displayName}`)
    .setColor(config.color)
    .setDescription(
      t.panel.description(config.capacity) +
      `\n\n${t.panel.roles}` +
      '\n\n_made by RaZe, Phong Ảnh Sát Guild_'
    )
    .setFooter({ text: t.panel.footer })
    .setTimestamp(new Date());

  if (guildName) {
    embed.setAuthor({ name: `${guildName} • ${t.embeds.partyFinder}` });
  }

  return embed;
}

/**
 * Create error embed for user-facing errors
 */
export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.ERROR} Error`)
    .setDescription(message + '\n\n_made by RaZe, Phong Ảnh Sát Guild_')
    .setColor(0xed4245) // Red
    .setTimestamp(new Date());
}

/**
 * Create success embed for confirmations
 */
export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Success`)
    .setDescription(message + '\n\n_made by RaZe, Phong Ảnh Sát Guild_')
    .setColor(0x57f287) // Green
    .setTimestamp(new Date());
}

/**
 * Create info embed for general information
 */
export function createInfoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.INFO} ${title}`)
    .setDescription(message + '\n\n_made by RaZe, Phong Ảnh Sát Guild_')
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
      `The **${config.displayName}** queue is now full with ${players.length} players!\n\nGet ready to start!\n\n_made by RaZe, Phong Ảnh Sát Guild_`
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
      `Successfully created **${config.displayName}** queue in ${channelMention}!\n\nPlayers can now join using the role buttons.\n\n_made by RaZe, Phong Ảnh Sát Guild_`
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
      `The **${config.displayName}** queue has been cleared.\n\nAll players have been removed from the queue.\n\n_made by RaZe, Phong Ảnh Sát Guild_`
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
      `The **${config.displayName}** queue has been closed and removed.\n\n_made by RaZe, Phong Ảnh Sát Guild_`
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
