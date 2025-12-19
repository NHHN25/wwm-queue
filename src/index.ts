import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config } from 'dotenv';
import { initializeDatabase, closeDatabase } from './database/database.js';
import { handleButtonInteraction } from './components/queueButtons.js';
import {
  registerCommands,
  handleCommandInteraction,
} from './commands/setup.js';
import { Queue } from './models/Queue.js';
import { createQueueEmbed } from './utils/embeds.js';
import { createJoinButtons } from './components/queueButtons.js';
import { handleRegistrationModalSubmit } from './components/registrationModal.js';
import {
  handleWeaponSelectMenu,
  handleRegistrationSubmitButton,
} from './components/registrationSelectMenus.js';
import { handleApprovalButtonInteraction } from './components/verificationButtons.js';
import { handleUpdateModalSubmit } from './components/updateModal.js';

// Load environment variables
config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

// ============================================================================
// Discord Client Setup
// ============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Required for guild info
    GatewayIntentBits.GuildMessages, // Required for message interactions
  ],
});

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Client ready event
 * Fires once when bot successfully connects to Discord
 */
client.once(Events.ClientReady, async (c) => {
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│ ✅ Bot logged in as ${c.user.tag.padEnd(22)} │`);
  console.log('└─────────────────────────────────────────┘');

  try {
    // Register slash commands
    await registerCommands(c);

    // Restore queue state from database
    await restoreQueueState(c);

    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 🚀 Bot is ready and operational!        │');
    console.log('└─────────────────────────────────────────┘');
  } catch (error) {
    console.error('❌ Error during bot initialization:', error);
  }
});

/**
 * Interaction create event
 * Handles all interactions (buttons, slash commands, etc.)
 */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      // Check if it's a registration submit button
      if (interaction.customId.startsWith('registration_submit_')) {
        await handleRegistrationSubmitButton(interaction);
      } else if (interaction.customId.startsWith('approval_')) {
        // Verification approval buttons
        await handleApprovalButtonInteraction(interaction);
      } else {
        // Queue buttons
        await handleButtonInteraction(interaction);
      }
    } else if (interaction.isChatInputCommand()) {
      await handleCommandInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('registration_')) {
        await handleWeaponSelectMenu(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('registration_modal')) {
        await handleRegistrationModalSubmit(interaction);
      } else if (interaction.customId === 'capnhat_modal') {
        await handleUpdateModalSubmit(interaction);
      }
    }
  } catch (error) {
    console.error('[Interaction] Unexpected error:', error);

    // Try to send generic error message
    try {
      const reply = {
        content: '❌ An unexpected error occurred. Please try again or contact an admin.',
        ephemeral: true,
      };

      if ('replied' in interaction && 'deferred' in interaction) {
        if (interaction.replied || interaction.deferred) {
          await (interaction as any).followUp(reply);
        } else if ('reply' in interaction) {
          await (interaction as any).reply(reply);
        }
      }
    } catch (replyError) {
      console.error('[Interaction] Failed to send error message:', replyError);
    }
  }
});

/**
 * Error event handler
 */
client.on(Events.Error, (error) => {
  console.error('[Client] Discord client error:', error);
});

/**
 * Warning event handler
 */
client.on(Events.Warn, (warning) => {
  console.warn('[Client] Discord client warning:', warning);
});

// ============================================================================
// Queue State Restoration
// ============================================================================

/**
 * Restore queue state on bot startup
 * Loads all queues from database and verifies Discord messages still exist
 */
async function restoreQueueState(client: Client): Promise<void> {
  console.log('[Restore] Loading queues from database...');

  const allQueues = Queue.loadAll();
  let restored = 0;
  let cleaned = 0;

  for (const queue of allQueues) {
    try {
      // Fetch channel
      const channel = await client.channels.fetch(queue.getChannelId());

      if (!channel?.isTextBased()) {
        console.warn(
          `[Restore] Channel ${queue.getChannelId()} not found or not text-based, deleting queue`
        );
        queue.delete();
        cleaned++;
        continue;
      }

      // Fetch message
      const message = await channel.messages.fetch(queue.getMessageId());

      if (!message) {
        console.warn(
          `[Restore] Message ${queue.getMessageId()} not found, deleting queue`
        );
        queue.delete();
        cleaned++;
        continue;
      }

      // Get guild name for embed
      const guild = await client.guilds.fetch(queue.getGuildId());
      const guildName = guild?.name;
      const guildId = queue.getGuildId();

      // Update message to ensure consistency
      const state = queue.getState();
      const embed = createQueueEmbed(state, guildName, guildId);

      await message.edit({
        embeds: [embed],
        components: [createJoinButtons(guildId)],
      });

      restored++;

      console.log(
        `[Restore] ✅ Restored ${queue.getQueueType()} queue in guild ${queue.getGuildId()}`
      );
    } catch (error) {
      console.error(
        `[Restore] ❌ Failed to restore queue ${queue.getMessageId()}:`,
        error
      );
      queue.delete();
      cleaned++;
    }
  }

  console.log(
    `[Restore] Restored ${restored} queues, cleaned up ${cleaned} orphaned records`
  );
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handle graceful shutdown
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

  try {
    // Destroy Discord client
    client.destroy();
    console.log('[Shutdown] Discord client destroyed');

    // Close database connection
    closeDatabase();

    console.log('[Shutdown] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught exception:', error);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled rejection at:', promise, 'reason:', reason);
});

// ============================================================================
// Initialize and Start Bot
// ============================================================================

/**
 * Main initialization function
 */
async function main(): Promise<void> {
  try {
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ Where Winds Meet Queue Bot              │');
    console.log('│ Starting up...                          │');
    console.log('└─────────────────────────────────────────┘');

    // Initialize database
    console.log('[Init] Initializing database...');
    initializeDatabase();

    // Login to Discord
    console.log('[Init] Connecting to Discord...');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the bot
main();
