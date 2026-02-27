import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  Client,
  REST,
  Routes,
  PermissionsBitField,
} from 'discord.js';
import type { QueueType } from '../types/index.js';
import { Queue } from '../models/Queue.js';
import { createQueueEmbed, createPanelEmbed } from '../utils/embeds.js';
import { createJoinButtons, createPanelButton } from '../components/queueButtons.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  QUEUE_CONFIGS,
} from '../utils/constants.js';
import {
  setGuildLanguage,
  getLanguageDisplayName,
  isValidLanguage,
  getGuildTranslations,
} from '../localization/index.js';
import {
  buildRegistrationCommands,
  handleRegistrationCommand,
} from './registration.js';
import {
  setupVerificationCommand,
  disableVerificationCommand,
  handleSetupVerification,
  handleDisableVerification,
} from './verification.js';
import {
  startQueueTimer,
  cancelQueueTimer,
} from '../utils/timerManager.js';
import * as db from '../database/database.js';

// ============================================================================
// Command Definitions
// ============================================================================

/**
 * Build slash command definitions
 */
export function buildCommands() {
  const setupCommand = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Create a queue for Where Winds Meet activities')
    .setDescriptionLocalizations({
      vi: 'Tạo tổ đội cho các hoạt động Where Winds Meet',
    })
    .addSubcommand((sub) =>
      sub
        .setName('sword-trial')
        .setDescription('Create a Sword Trial queue (5 players)')
        .setDescriptionLocalizations({
          vi: 'Tạo tổ đội Sword Trial (5 người chơi)',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .setDescriptionLocalizations({
              vi: 'Kênh cho tổ đội (mặc định: kênh hiện tại)',
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('hero-realm')
        .setDescription('Create a Hero Realm queue (10 players)')
        .setDescriptionLocalizations({
          vi: 'Tạo tổ đội Hero Realm (10 người chơi)',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .setDescriptionLocalizations({
              vi: 'Kênh cho tổ đội (mặc định: kênh hiện tại)',
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('guild-war')
        .setDescription('Create a Guild War queue (30 players)')
        .setDescriptionLocalizations({
          vi: 'Tạo tổ đội Chiến Trường Bang Hội (30 người chơi)',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .setDescriptionLocalizations({
              vi: 'Kênh cho tổ đội (mặc định: kênh hiện tại)',
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const resetCommand = new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clear all players from a queue')
    .setDescriptionLocalizations({
      vi: 'Xóa tất cả người chơi khỏi tổ đội',
    })
    .addStringOption((opt) =>
      opt
        .setName('queue-type')
        .setDescription('Which queue to reset')
        .setDescriptionLocalizations({
          vi: 'Tổ đội nào cần xóa',
        })
        .setRequired(true)
        .addChoices(
          { name: 'Sword Trial', value: 'sword_trial' },
          { name: 'Hero Realm', value: 'hero_realm' },
          { name: 'Guild War', value: 'guild_war' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const closeCommand = new SlashCommandBuilder()
    .setName('close')
    .setDescription('Delete a queue completely')
    .setDescriptionLocalizations({
      vi: 'Xóa hoàn toàn tổ đội',
    })
    .addStringOption((opt) =>
      opt
        .setName('queue-type')
        .setDescription('Which queue to close')
        .setDescriptionLocalizations({
          vi: 'Tổ đội nào cần đóng',
        })
        .setRequired(true)
        .addChoices(
          { name: 'Sword Trial', value: 'sword_trial' },
          { name: 'Hero Realm', value: 'hero_realm' },
          { name: 'Guild War', value: 'guild_war' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const closepanelCommand = new SlashCommandBuilder()
    .setName('closepanel')
    .setDescription('Delete a panel completely')
    .setDescriptionLocalizations({
      vi: 'Xóa hoàn toàn bảng tổ đội',
    })
    .addStringOption((opt) =>
      opt
        .setName('queue-type')
        .setDescription('Which panel to delete')
        .setDescriptionLocalizations({
          vi: 'Bảng nào cần xóa',
        })
        .setRequired(true)
        .addChoices(
          { name: 'Sword Trial', value: 'sword_trial' },
          { name: 'Hero Realm', value: 'hero_realm' },
          { name: 'Guild War', value: 'guild_war' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const languageCommand = new SlashCommandBuilder()
    .setName('language')
    .setDescription('Change the bot language')
    .setDescriptionLocalizations({
      vi: 'Thay đổi ngôn ngữ bot',
    })
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Select a language')
        .setDescriptionLocalizations({
          vi: 'Chọn ngôn ngữ',
        })
        .setRequired(true)
        .addChoices(
          { name: 'English', value: 'en' },
          { name: 'Tiếng Việt', value: 'vi' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const queueCommands = [setupCommand, resetCommand, closeCommand, closepanelCommand, languageCommand];
  const registrationCommands = buildRegistrationCommands();
  const verificationCommands = [
    setupVerificationCommand,
    disableVerificationCommand,
  ];

  return [...queueCommands, ...registrationCommands, ...verificationCommands];
}

// ============================================================================
// Command Registration
// ============================================================================

/**
 * Register slash commands with Discord
 */
export async function registerCommands(client: Client): Promise<void> {
  if (!client.user) {
    throw new Error('Client user is not available');
  }

  const commands = buildCommands();
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('[Commands] Registering slash commands globally...');
    console.log(`[Commands] Total commands to register: ${commands.length}`);
    console.log('[Commands] Command names:', commands.map(cmd => cmd.name).join(', '));

    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((cmd) => cmd.toJSON()),
    });

    console.log('[Commands] Successfully registered slash commands');
  } catch (error) {
    console.error('[Commands] Failed to register slash commands:', error);
    throw error;
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Handle all slash command interactions
 */
export async function handleCommandInteraction(
  interaction: CommandInteraction
): Promise<void> {
  const commandName = interaction.commandName;

  try {
    if (commandName === 'setup') {
      await handleSetupCommand(interaction);
    } else if (commandName === 'reset') {
      await handleResetCommand(interaction);
    } else if (commandName === 'close') {
      await handleCloseCommand(interaction);
    } else if (commandName === 'closepanel') {
      await handleClosePanelCommand(interaction);
    } else if (commandName === 'language') {
      await handleLanguageCommand(interaction);
    } else if (
      ['register', 'baodanh', 'info', 'setup-registration', 'capnhat'].includes(
        commandName
      )
    ) {
      await handleRegistrationCommand(interaction);
    } else if (commandName === 'setupverification') {
      await handleSetupVerification(interaction as any);
    } else if (commandName === 'disableverification') {
      await handleDisableVerification(interaction as any);
    }
  } catch (error) {
    console.error(`[Commands] Error handling /${commandName}:`, error);

    const reply = {
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyError) {
      console.error('[Commands] Failed to send error message:', replyError);
    }
  }
}

/**
 * Handle /setup command
 * Creates a persistent panel embed with a "Create Queue" button
 */
async function handleSetupCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  // Get subcommand (sword-trial, hero-realm, or guild-war)
  const subcommand = (interaction as any).options.data[0]?.name as
    | 'sword-trial'
    | 'hero-realm'
    | 'guild-war';

  const queueType: QueueType =
    subcommand === 'sword-trial' ? 'sword_trial' :
    subcommand === 'hero-realm' ? 'hero_realm' :
    'guild_war';

  const displayName = queueType === 'sword_trial'
    ? t.queueTypes.swordTrial
    : queueType === 'hero_realm'
    ? t.queueTypes.heroRealm
    : t.queueTypes.guildWar;

  // Get target channel (or default to current)
  const targetChannel =
    ((interaction as any).options.get('channel')?.channel ?? interaction.channel);

  if (!targetChannel || !targetChannel.isTextBased()) {
    await interaction.reply({
      content: t.errors.invalidChannel,
      ephemeral: true,
    });
    return;
  }

  try {
    // 1. Check if panel already exists for this queue type
    const existingPanel = db.getPanelByType(interaction.guildId, queueType);

    if (existingPanel) {
      await interaction.reply({
        content: t.panel.panelAlreadyExists,
        ephemeral: true,
      });
      return;
    }

    // 2. Verify bot permissions in target channel
    const botMember = await interaction.guild.members.fetchMe();
    const permissions = targetChannel.permissionsFor(botMember);

    if (!permissions) {
      await interaction.reply({
        content: `❌ I cannot access ${targetChannel}. Please check that I have "View Channel" permission.`,
        ephemeral: true,
      });
      return;
    }

    const missingPermissions: string[] = [];

    if (!permissions.has(PermissionsBitField.Flags.ViewChannel)) {
      missingPermissions.push('View Channel');
    }
    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
      missingPermissions.push('Send Messages');
    }
    if (!permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
      missingPermissions.push('Embed Links');
    }
    if (!permissions.has(PermissionsBitField.Flags.ReadMessageHistory)) {
      missingPermissions.push('Read Message History');
    }

    if (missingPermissions.length > 0) {
      await interaction.reply({
        content: t.errors.missingPermissions(missingPermissions),
        ephemeral: true,
      });
      return;
    }

    // 3. Defer reply (panel creation might take a moment)
    await interaction.deferReply({ ephemeral: true });

    // 4. Create panel embed and button
    const guildName = interaction.guild.name;
    const embed = createPanelEmbed(queueType, guildName, interaction.guildId);
    const button = createPanelButton(queueType, interaction.guildId);

    // 5. Send panel message
    const message = await targetChannel.send({
      embeds: [embed],
      components: [button],
    });

    // 6. Save panel to database
    db.createPanel(message.id, interaction.guildId, targetChannel.id, queueType);

    // 7. Confirm success
    await interaction.editReply({
      content: t.panel.panelCreated(displayName, `<#${targetChannel.id}>`),
    });

    console.log(
      `[Setup] Created ${queueType} panel in guild ${interaction.guildId}, channel ${targetChannel.id}`
    );
  } catch (error) {
    console.error('[Setup] Error creating panel:', error);

    await interaction.editReply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
}

/**
 * Handle /reset command
 */
async function handleResetCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const queueType = (interaction as any).options.get('queue-type')?.value as QueueType;

  try {
    // 1. Find queue
    const queue = Queue.loadByType(interaction.guildId, queueType);

    if (!queue) {
      await interaction.reply({
        content: `❌ No ${QUEUE_CONFIGS[queueType].displayName} queue exists in this server.`,
        ephemeral: true,
      });
      return;
    }

    // 2. Defer reply
    await interaction.deferReply({ ephemeral: true });

    // 3. Cancel existing timer
    cancelQueueTimer(queue.getMessageId());

    // 4. Clear all players and reopen the queue (restarts timer)
    queue.clear();
    queue.reopen();

    // 5. Start new timer
    startQueueTimer(queue, interaction.client);

    // 6. Update message
    const state = queue.getState();
    const guildName = interaction.guild?.name;
    const embed = createQueueEmbed(state, guildName, interaction.guildId);

    const channel = await interaction.client.channels.fetch(queue.getChannelId());
    if (channel?.isTextBased()) {
      const message = await channel.messages.fetch(queue.getMessageId());
      await message.edit({
        embeds: [embed],
        components: [createJoinButtons(interaction.guildId)],
      });
    }

    // 7. Confirm success
    const successMessage = SUCCESS_MESSAGES.QUEUE_RESET(queueType);
    await interaction.editReply({ content: successMessage });

    console.log(`[Reset] Cleared and reopened ${queueType} queue in guild ${interaction.guildId}`);
  } catch (error) {
    console.error('[Reset] Error resetting queue:', error);

    await interaction.editReply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
}

/**
 * Handle /close command
 * Closes the active queue but leaves the panel in place
 */
async function handleCloseCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const queueType = (interaction as any).options.get('queue-type')?.value as QueueType;
  const t = getGuildTranslations(interaction.guildId);

  try {
    // 1. Find queue
    const queue = Queue.loadByType(interaction.guildId, queueType);

    if (!queue) {
      await interaction.reply({
        content: t.panel.noActiveQueue,
        ephemeral: true,
      });
      return;
    }

    // 2. Defer reply
    await interaction.deferReply({ ephemeral: true });

    // 3. Cancel the timer
    cancelQueueTimer(queue.getMessageId());

    // 4. Delete message from Discord
    try {
      const channel = await interaction.client.channels.fetch(queue.getChannelId());
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(queue.getMessageId());
        await message.delete();
      }
    } catch (error) {
      console.warn('[Close] Failed to delete message (may already be deleted):', error);
    }

    // 5. Delete from database
    queue.delete();

    // 5. Confirm success
    const successMessage = SUCCESS_MESSAGES.QUEUE_CLOSED(queueType);
    await interaction.editReply({ content: successMessage });

    console.log(`[Close] Deleted ${queueType} queue in guild ${interaction.guildId}`);
  } catch (error) {
    console.error('[Close] Error closing queue:', error);

    await interaction.editReply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
}

/**
 * Handle /closepanel command
 * Deletes a panel embed and its database record
 */
async function handleClosePanelCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const queueType = (interaction as any).options.get('queue-type')?.value as QueueType;
  const t = getGuildTranslations(interaction.guildId);

  const displayName = queueType === 'sword_trial'
    ? t.queueTypes.swordTrial
    : queueType === 'hero_realm'
    ? t.queueTypes.heroRealm
    : t.queueTypes.guildWar;

  try {
    // 1. Find panel
    const panel = db.getPanelByType(interaction.guildId, queueType);

    if (!panel) {
      await interaction.reply({
        content: `❌ No ${QUEUE_CONFIGS[queueType].displayName} panel exists in this server.`,
        ephemeral: true,
      });
      return;
    }

    // 2. Defer reply
    await interaction.deferReply({ ephemeral: true });

    // 3. Delete message from Discord
    try {
      const channel = await interaction.client.channels.fetch(panel.channel_id);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(panel.message_id);
        await message.delete();
      }
    } catch (error) {
      console.warn('[ClosePanel] Failed to delete message (may already be deleted):', error);
    }

    // 4. Delete from database
    db.deletePanel(panel.message_id);

    // 5. Confirm success
    await interaction.editReply({
      content: t.panel.panelDeleted(displayName),
    });

    console.log(`[ClosePanel] Deleted ${queueType} panel in guild ${interaction.guildId}`);
  } catch (error) {
    console.error('[ClosePanel] Error closing panel:', error);

    await interaction.editReply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
}

/**
 * Handle /language command
 */
async function handleLanguageCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
      ephemeral: true,
    });
    return;
  }

  const languageOption = (interaction as any).options.get('language')?.value as string;

  // Validate language
  if (!isValidLanguage(languageOption)) {
    await interaction.reply({
      content: `❌ Invalid language. Please select a valid language.`,
      ephemeral: true,
    });
    return;
  }

  try {
    // Defer reply (updating queues might take a moment)
    await interaction.deferReply({ ephemeral: true });

    // Set guild language
    const success = setGuildLanguage(interaction.guildId, languageOption);

    if (!success) {
      await interaction.editReply({
        content: ERROR_MESSAGES.GENERIC_ERROR,
      });
      return;
    }

    // Update all queue embeds for this guild with new language
    const queues = Queue.loadAllForGuild(interaction.guildId);
    let updatedCount = 0;

    for (const queue of queues) {
      try {
        // Fetch channel and message
        const channel = await interaction.client.channels.fetch(queue.getChannelId());
        if (!channel?.isTextBased()) continue;

        const message = await channel.messages.fetch(queue.getMessageId());
        
        // Update embed with new language
        const state = queue.getState();
        const guildName = interaction.guild.name;
        const embed = createQueueEmbed(state, guildName, interaction.guildId);

        await message.edit({
          embeds: [embed],
          components: [createJoinButtons(interaction.guildId)],
        });

        updatedCount++;
      } catch (error) {
        console.warn(`[Language] Failed to update queue ${queue.getMessageId()}:`, error);
      }
    }

    // Refresh all panel embeds for this guild with new language
    const panelRows = db.getGuildPanels(interaction.guildId);
    let updatedPanels = 0;

    for (const panelRow of panelRows) {
      try {
        const panelChannel = await interaction.client.channels.fetch(panelRow.channel_id);
        if (!panelChannel?.isTextBased()) continue;

        const panelMessage = await panelChannel.messages.fetch(panelRow.message_id);
        const panelEmbed = createPanelEmbed(
          panelRow.queue_type as QueueType,
          interaction.guild.name,
          interaction.guildId
        );
        const panelButton = createPanelButton(
          panelRow.queue_type as QueueType,
          interaction.guildId
        );

        await panelMessage.edit({
          embeds: [panelEmbed],
          components: [panelButton],
        });

        updatedPanels++;
      } catch (error) {
        console.warn(`[Language] Failed to update panel ${panelRow.message_id}:`, error);
      }
    }

    // Get display name for the selected language
    const languageName = getLanguageDisplayName(languageOption);
    const totalUpdated = updatedCount + updatedPanels;

    // Confirm success
    const response = totalUpdated > 0
      ? `✅ Language changed to **${languageName}**\n\nUpdated ${totalUpdated} message${totalUpdated === 1 ? '' : 's'}.`
      : `✅ Language changed to **${languageName}**`;

    await interaction.editReply({
      content: response,
    });

    console.log(
      `[Language] Changed language to ${languageOption} for guild ${interaction.guildId}, updated ${updatedCount} queues`
    );
  } catch (error) {
    console.error('[Language] Error changing language:', error);

    try {
      await interaction.editReply({
        content: ERROR_MESSAGES.GENERIC_ERROR,
      });
    } catch (replyError) {
      console.error('[Language] Failed to send error message:', replyError);
    }
  }
}
