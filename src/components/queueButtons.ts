import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import type { PlayerRole, QueueType } from '../types/index.js';
import { Queue } from '../models/Queue.js';
import { createQueueEmbed, createDisabledButtons } from '../utils/embeds.js';
import {
  BUTTON_IDS,
  ERROR_MESSAGES,
  QUEUE_FULL_MESSAGE,
  QUEUE_CONFIGS,
  parseButtonId,
  parsePanelButtonId,
  ROLE_CONFIGS,
} from '../utils/constants.js';
import { formatPlayerMentions } from '../models/QueuePlayer.js';
import { getGuildTranslations } from '../localization/index.js';
import { cancelQueueTimer } from '../utils/timerManager.js';
import * as db from '../database/database.js';

// Re-export formatPlayerMentions for use by timerManager
export { formatPlayerMentions } from '../models/QueuePlayer.js';

// ============================================================================
// Button Builders
// ============================================================================

/**
 * Create all queue buttons (Tank, Healer, DPS, Leave)
 * All buttons shown together for easy access
 * Tank/Healer/DPS stay in English, only Leave button is localized
 */
export function createJoinButtons(guildId?: string): ActionRowBuilder<ButtonBuilder> {
  // Get translations for Leave button only
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  const tankButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_TANK)
    .setLabel(`${ROLE_CONFIGS.tank.emoji} ${ROLE_CONFIGS.tank.displayName}`) // Keep in English
    .setStyle(ButtonStyle.Danger); // Orange/Red

  const healerButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_HEALER)
    .setLabel(`${ROLE_CONFIGS.healer.emoji} ${ROLE_CONFIGS.healer.displayName}`) // Keep in English
    .setStyle(ButtonStyle.Success); // Green

  const dpsButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.JOIN_DPS)
    .setLabel(`${ROLE_CONFIGS.dps.emoji} ${ROLE_CONFIGS.dps.displayName}`) // Keep in English
    .setStyle(ButtonStyle.Primary); // Blue

  const leaveButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.LEAVE)
    .setLabel(t.buttons.leave) // Localized
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
export function createLeaveButton(guildId?: string): ActionRowBuilder<ButtonBuilder> {
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  const leaveButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.LEAVE)
    .setLabel(t.buttons.leave) // Localized
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton);
}

/**
 * Create the "Create Queue" button shown on a panel embed
 */
export function createPanelButton(
  queueType: QueueType,
  guildId?: string
): ActionRowBuilder<ButtonBuilder> {
  const t = guildId ? getGuildTranslations(guildId) : getGuildTranslations('');

  const displayName = queueType === 'sword_trial'
    ? t.queueTypes.swordTrial
    : t.queueTypes.heroRealm;

  const customId = queueType === 'sword_trial'
    ? BUTTON_IDS.PANEL_CREATE_SWORD_TRIAL
    : BUTTON_IDS.PANEL_CREATE_HERO_REALM;

  const emoji = QUEUE_CONFIGS[queueType].emoji;

  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(t.panel.createButton(displayName))
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
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
  // Try panel button routing first
  const panelParsed = parsePanelButtonId(interaction.customId);
  if (panelParsed) {
    await handlePanelCreateButton(interaction, panelParsed.queueType);
    return;
  }

  // Existing queue button routing
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

    // 2. Check if queue is closed
    if (queue.isClosed()) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_CLOSED,
        ephemeral: true,
      });
      return;
    }

    // 3. Check if user is already in THIS queue - if so, switch their role
    if (queue.hasPlayer(userId)) {
      // Remove from current role and add with new role
      queue.removePlayer(userId);
      const switched = queue.addPlayer(userId, username, role);

      if (switched) {
        // Update the queue embed
        const state = queue.getState();
        const guildName = interaction.guild?.name;
        const guildId = interaction.guildId || undefined;
        const embed = createQueueEmbed(state, guildName, guildId);

        await interaction.update({
          embeds: [embed],
          components: [createJoinButtons(guildId)],
        });

        // Send ephemeral confirmation
        const t = getGuildTranslations(guildId || '');
        const roleEmoji = ROLE_CONFIGS[role].emoji;
        const roleName = ROLE_CONFIGS[role].displayName;
        const roleDisplay = `${roleEmoji} **${roleName}**`;
        await interaction.followUp({
          content: t.success.switchedRole(roleDisplay),
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
    const guildId = interaction.guildId || undefined;
    const embed = createQueueEmbed(state, guildName, guildId);

    await interaction.update({
      embeds: [embed],
      components: [createJoinButtons(guildId)],
    });

    // Send ephemeral confirmation to the user
    const t = getGuildTranslations(guildId || '');
    const roleEmoji = ROLE_CONFIGS[role].emoji;
    const roleName = ROLE_CONFIGS[role].displayName;
    const roleDisplay = `${roleEmoji} **${roleName}**`;
    await interaction.followUp({
      content: t.success.joinedQueue(roleDisplay),
      ephemeral: true,
    });

    // 5. If queue is now full, close queue and send notification
    if (queue.isFull()) {
      // Cancel the timer
      cancelQueueTimer(messageId);

      // Close the queue
      queue.close();

      // Update embed to show closed state with disabled buttons
      const closedState = queue.getState();
      const closedEmbed = createQueueEmbed(closedState, guildName, guildId);
      await interaction.message.edit({
        embeds: [closedEmbed],
        components: [createDisabledButtons(guildId)],
      });

      // Send notification pinging all players
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

    // 2. Check if queue is closed
    if (queue.isClosed()) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_CLOSED,
        ephemeral: true,
      });
      return;
    }

    // 3. Remove player from queue
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
    const guildId = interaction.guildId || undefined;
    const embed = createQueueEmbed(state, guildName, guildId);

    await interaction.update({
      embeds: [embed],
      components: [createJoinButtons(guildId)],
    });

    // Send ephemeral confirmation
    const t = getGuildTranslations(guildId || '');
    await interaction.followUp({
      content: t.success.leftQueue,
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
 * Handle panel "Create Queue" button click
 * Anyone can click — no permission check needed
 */
async function handlePanelCreateButton(
  interaction: ButtonInteraction,
  queueType: QueueType
): Promise<void> {
  const panelMessageId = interaction.message.id;
  const guildId = interaction.guildId;

  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(guildId);

  try {
    // 1. Verify the panel still exists in DB
    const panel = db.getPanel(panelMessageId);
    if (!panel) {
      await interaction.reply({
        content: t.errors.genericError,
        ephemeral: true,
      });
      return;
    }

    // 2. Check for existing active queue of this type
    const existingQueue = Queue.loadByType(guildId, queueType);
    if (existingQueue) {
      await interaction.reply({
        content: t.errors.queueAlreadyExists,
        ephemeral: true,
      });
      return;
    }

    // 3. Defer reply before async work
    await interaction.deferReply({ ephemeral: true });

    // 4. Build initial queue embed (empty queue)
    const guildName = interaction.guild.name;
    const initialState = {
      queue: {
        messageId: '',
        guildId,
        channelId: interaction.channelId,
        queueType,
        capacity: QUEUE_CONFIGS[queueType].capacity,
        createdAt: new Date(),
      },
      players: [],
    };

    const embed = createQueueEmbed(initialState, guildName, guildId);
    const buttons = createJoinButtons(guildId);

    // 5. Send the queue message to the same channel
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      await interaction.editReply({ content: t.errors.genericError });
      return;
    }

    const message = await channel.send({
      embeds: [embed],
      components: [buttons],
    });

    // 6. Persist the queue in database
    Queue.create(message.id, guildId, interaction.channelId, queueType);

    // 7. Confirm to the user who clicked
    const displayName = queueType === 'sword_trial'
      ? t.queueTypes.swordTrial
      : t.queueTypes.heroRealm;

    await interaction.editReply({
      content: t.panel.queueCreatedByPanel(displayName),
    });

    console.log(
      `[Panel] Created ${queueType} queue in guild ${guildId}, channel ${interaction.channelId}`
    );
  } catch (error) {
    console.error('[Panel] Error handling panel create button:', error);

    try {
      const reply = { content: t.errors.genericError, ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyError) {
      console.error('[Panel] Failed to send error message:', replyError);
    }
  }
}
