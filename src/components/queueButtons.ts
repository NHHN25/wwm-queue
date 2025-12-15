import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import type { PlayerRole } from '../types/index.js';
import { Queue } from '../models/Queue.js';
import { createQueueEmbed } from '../utils/embeds.js';
import {
  BUTTON_IDS,
  ERROR_MESSAGES,
  QUEUE_FULL_MESSAGE,
  parseButtonId,
  ROLE_CONFIGS,
} from '../utils/constants.js';
import { formatPlayerMentions } from '../models/QueuePlayer.js';

// ============================================================================
// Button Builders
// ============================================================================

/**
 * Create all queue buttons (Tank, Healer, DPS, Leave)
 * All buttons shown together for easy access
 */
export function createJoinButtons(): ActionRowBuilder<ButtonBuilder> {
  const tankButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_TANK)
    .setLabel(`${ROLE_CONFIGS.tank.emoji} ${ROLE_CONFIGS.tank.displayName}`)
    .setStyle(ButtonStyle.Primary);

  const healerButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_HEALER)
    .setLabel(`${ROLE_CONFIGS.healer.emoji} ${ROLE_CONFIGS.healer.displayName}`)
    .setStyle(ButtonStyle.Success);

  const dpsButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_DPS)
    .setLabel(`${ROLE_CONFIGS.dps.emoji} ${ROLE_CONFIGS.dps.displayName}`)
    .setStyle(ButtonStyle.Danger);

  const leaveButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.LEAVE)
    .setLabel('❌ Leave')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    tankButton,
    healerButton,
    dpsButton,
    leaveButton
  );
}

/**
 * Create leave button (legacy - now unused but kept for compatibility)
 */
export function createLeaveButton(): ActionRowBuilder<ButtonBuilder> {
  const leaveButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.LEAVE)
    .setLabel('Leave Queue')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton);
}

// ============================================================================
// Button Interaction Handlers
// ============================================================================

/**
 * Handle button interactions (main router)
 */
export async function handleButtonInteraction(
  interaction: ButtonInteraction
): Promise<void> {
  const parsed = parseButtonId(interaction.customId);

  if (!parsed) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  if (parsed.action === 'join' && parsed.role) {
    await handleJoinButton(interaction, parsed.role);
  } else if (parsed.action === 'leave') {
    await handleLeaveButton(interaction);
  }
}

/**
 * Handle join button click
 * Implements the TWO-UPDATE PATTERN for per-user button states
 */
async function handleJoinButton(
  interaction: ButtonInteraction,
  role: PlayerRole
): Promise<void> {
  const messageId = interaction.message.id;
  const userId = interaction.user.id;
  const username = interaction.user.displayName || interaction.user.username;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  try {
    // 1. Load queue from database
    const queue = Queue.load(messageId);

    if (!queue) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_NOT_FOUND,
        ephemeral: true,
      });
      return;
    }

    // 2. Check if user is already in THIS queue - if so, switch their role
    if (queue.hasPlayer(userId)) {
      // Remove from current role and add with new role
      queue.removePlayer(userId);
      const switched = queue.addPlayer(userId, username, role);

      if (switched) {
        // Update the queue embed
        const state = queue.getState();
        const guildName = interaction.guild?.name;
        const embed = createQueueEmbed(state, guildName);

        await interaction.update({
          embeds: [embed],
          components: [createJoinButtons()],
        });

        // Send ephemeral confirmation
        const roleEmoji = ROLE_CONFIGS[role].emoji;
        const roleName = ROLE_CONFIGS[role].displayName;
        await interaction.followUp({
          content: `🔄 You switched to ${roleEmoji} **${roleName}**!`,
          ephemeral: true,
        });
      }
      return;
    }

    // 3. Check if queue is full
    if (queue.isFull()) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_FULL,
        ephemeral: true,
      });
      return;
    }

    // 4. Check if user is in another queue
    const otherQueueMessageId = queue.getUserOtherQueue(userId);
    if (otherQueueMessageId) {
      await interaction.reply({
        content: ERROR_MESSAGES.PLAYER_IN_ANOTHER_QUEUE,
        ephemeral: true,
      });
      return;
    }

    // 5. Add player to queue
    const added = queue.addPlayer(userId, username, role);

    if (!added) {
      // Player already in this queue
      await interaction.reply({
        content: ERROR_MESSAGES.PLAYER_ALREADY_IN_QUEUE,
        ephemeral: true,
      });
      return;
    }

    // ========================================================================
    // Update queue display and notify user
    // ========================================================================

    // Update the queue embed for everyone
    const state = queue.getState();
    const guildName = interaction.guild?.name;
    const embed = createQueueEmbed(state, guildName);

    await interaction.update({
      embeds: [embed],
      components: [createJoinButtons()],
    });

    // Send ephemeral confirmation to the user
    const roleEmoji = ROLE_CONFIGS[role].emoji;
    const roleName = ROLE_CONFIGS[role].displayName;
    await interaction.followUp({
      content: `✅ You joined the queue as ${roleEmoji} **${roleName}**!\n\n💡 *Click a different role to switch, or click ❌ Leave to exit the queue.*`,
      ephemeral: true,
    });

    // 5. If queue is now full, send notification
    if (queue.isFull()) {
      await sendQueueFullNotification(interaction, queue);
    }
  } catch (error) {
    console.error('[Button Handler] Error handling join button:', error);

    // Try to send error message
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: ERROR_MESSAGES.GENERIC_ERROR,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: ERROR_MESSAGES.GENERIC_ERROR,
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error('[Button Handler] Failed to send error message:', replyError);
    }
  }
}

/**
 * Handle leave button click
 * Implements the TWO-UPDATE PATTERN
 */
async function handleLeaveButton(
  interaction: ButtonInteraction
): Promise<void> {
  const messageId = interaction.message.id;
  const userId = interaction.user.id;

  try {
    // 1. Load queue from database
    const queue = Queue.load(messageId);

    if (!queue) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_NOT_FOUND,
        ephemeral: true,
      });
      return;
    }

    // 2. Remove player from queue
    const removed = queue.removePlayer(userId);

    if (!removed) {
      // Player not in queue
      await interaction.reply({
        content: ERROR_MESSAGES.PLAYER_NOT_IN_QUEUE,
        ephemeral: true,
      });
      return;
    }

    // Update the queue embed
    const state = queue.getState();
    const guildName = interaction.guild?.name;
    const embed = createQueueEmbed(state, guildName);

    await interaction.update({
      embeds: [embed],
      components: [createJoinButtons()],
    });

    // Send ephemeral confirmation
    await interaction.followUp({
      content: `✅ You left the queue.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error('[Button Handler] Error handling leave button:', error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: ERROR_MESSAGES.GENERIC_ERROR,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: ERROR_MESSAGES.GENERIC_ERROR,
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error('[Button Handler] Failed to send error message:', replyError);
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send queue full notification
 * Pings all players in the queue
 */
async function sendQueueFullNotification(
  interaction: ButtonInteraction,
  queue: Queue
): Promise<void> {
  try {
    const state = queue.getState();
    const playerIds = state.players.map((p) => p.userId);
    const playerMentions = formatPlayerMentions(playerIds);
    const queueType = queue.getQueueType();

    const message = QUEUE_FULL_MESSAGE(queueType, playerMentions);

    await interaction.followUp({
      content: message,
      allowedMentions: {
        users: playerIds,
      },
    });
  } catch (error) {
    console.error('[Queue Full] Failed to send notification:', error);
  }
}

/**
 * Log button interaction (development only)
 * Currently unused but kept for future debugging
 */
// function logButtonInteraction(
//   action: 'join' | 'leave',
//   userId: string,
//   role?: PlayerRole
// ): void {
//   if (process.env.NODE_ENV === 'development') {
//     const roleText = role ? ` as ${role}` : '';
//     console.log(`[Button] User ${userId} ${action}${roleText}`);
//   }
// }
