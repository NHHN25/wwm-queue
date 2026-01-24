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
import { createQueueEmbed } from '../utils/embeds.js';
import { createJoinButtons } from '../components/queueButtons.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  QUEUE_CONFIGS,
} from '../utils/constants.js';
import {
  setGuildLanguage,
  getLanguageDisplayName,
  isValidLanguage,
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
    .addSubcommand((sub) =>
      sub
        .setName('sword-trial')
        .setDescription('Create a Sword Trial queue (5 players)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('hero-realm')
        .setDescription('Create a Hero Realm queue (10 players)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('guild-war')
        .setDescription('Create a Guild War queue (30 players)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for the queue (default: current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const resetCommand = new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clear all players from a queue')
    .addStringOption((opt) =>
      opt
        .setName('queue-type')
        .setDescription('Which queue to reset')
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
    .addStringOption((opt) =>
      opt
        .setName('queue-type')
        .setDescription('Which queue to close')
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
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Select a language')
        .setRequired(true)
        .addChoices(
          { name: 'English', value: 'en' },
          { name: 'Vietnamese', value: 'vi' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const queueCommands = [setupCommand, resetCommand, closeCommand, languageCommand];
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

  // Get subcommand (sword-trial, hero-realm, or guild-war)
  const subcommand = (interaction as any).options.data[0]?.name as
    | 'sword-trial'
    | 'hero-realm'
    | 'guild-war';

  const queueType: QueueType =
    subcommand === 'sword-trial' ? 'sword_trial' :
    subcommand === 'hero-realm' ? 'hero_realm' :
    'guild_war';

  // Get target channel (or default to current)
  const targetChannel =
    ((interaction as any).options.get('channel')?.channel ?? interaction.channel);

  if (!targetChannel || !targetChannel.isTextBased()) {
    await interaction.reply({
      content: '❌ Invalid channel. Please select a text channel.',
      ephemeral: true,
    });
    return;
  }

  try {
    // 1. Check if queue already exists
    const existingQueue = Queue.loadByType(interaction.guildId, queueType);

    if (existingQueue) {
      await interaction.reply({
        content: ERROR_MESSAGES.QUEUE_ALREADY_EXISTS,
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
        content: `❌ I'm missing these permissions in ${targetChannel}:\n${missingPermissions.map(p => `• ${p}`).join('\n')}\n\nPlease grant these permissions and try again.`,
        ephemeral: true,
      });
      return;
    }

    // 3. Defer reply (queue creation might take a moment)
    await interaction.deferReply({ ephemeral: true });

    // 4. Create initial queue embed
    const guildName = interaction.guild.name;
    const initialState = {
      queue: {
        messageId: '', // Will be set after sending
        guildId: interaction.guildId,
        channelId: targetChannel.id,
        queueType,
        capacity: QUEUE_CONFIGS[queueType].capacity,
        createdAt: new Date(),
      },
      players: [],
    };

    const embed = createQueueEmbed(initialState, guildName, interaction.guildId);
    const buttons = createJoinButtons(interaction.guildId);

    // 5. Send queue message
    const message = await targetChannel.send({
      embeds: [embed],
      components: [buttons],
    });

    // 6. Create queue in database
    Queue.create(message.id, interaction.guildId, targetChannel.id, queueType);

    // 7. Confirm success
    const successMessage = SUCCESS_MESSAGES.QUEUE_CREATED(
      queueType,
      `<#${targetChannel.id}>`
    );

    await interaction.editReply({
      content: successMessage,
    });

    console.log(
      `[Setup] Created ${queueType} queue in guild ${interaction.guildId}, channel ${targetChannel.id}`
    );
  } catch (error) {
    console.error('[Setup] Error creating queue:', error);

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

    // 3. Clear all players
    queue.clear();

    // 4. Update message
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

    // 5. Confirm success
    const successMessage = SUCCESS_MESSAGES.QUEUE_RESET(queueType);
    await interaction.editReply({ content: successMessage });

    console.log(`[Reset] Cleared ${queueType} queue in guild ${interaction.guildId}`);
  } catch (error) {
    console.error('[Reset] Error resetting queue:', error);

    await interaction.editReply({
      content: ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
}

/**
 * Handle /close command
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

    // 3. Delete message from Discord
    try {
      const channel = await interaction.client.channels.fetch(queue.getChannelId());
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(queue.getMessageId());
        await message.delete();
      }
    } catch (error) {
      console.warn('[Close] Failed to delete message (may already be deleted):', error);
    }

    // 4. Delete from database
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

    // Get display name for the selected language
    const languageName = getLanguageDisplayName(languageOption);

    // Confirm success
    const response = updatedCount > 0
      ? `✅ Language changed to **${languageName}**\n\nUpdated ${updatedCount} queue${updatedCount === 1 ? '' : 's'}.`
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
