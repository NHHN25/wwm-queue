import { Client, TextChannel } from 'discord.js';
import { Queue } from '../models/Queue.js';
import { createQueueEmbed, createDisabledButtons } from './embeds.js';
import { getGuildTranslations } from '../localization/index.js';
import { formatPlayerMentions } from '../components/queueButtons.js';

/**
 * In-memory storage for active queue timers
 * Maps message_id -> NodeJS.Timeout
 */
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Start a timer for a queue
 * When the timer expires, it will close the queue, ping players, and update the embed
 */
export function startQueueTimer(queue: Queue, client: Client): void {
  const messageId = queue.getMessageId();
  const timeRemaining = queue.getTimeRemaining();

  // Don't start timer if queue is already closed or expired
  if (queue.isClosed() || timeRemaining <= 0) {
    return;
  }

  // Cancel existing timer if any
  cancelQueueTimer(messageId);

  // Schedule expiration callback
  const timerId = setTimeout(async () => {
    await handleQueueExpiration(messageId, client);
  }, timeRemaining);

  activeTimers.set(messageId, timerId);

  console.log(
    `[Timer] Started timer for queue ${messageId}, expires in ${Math.round(timeRemaining / 1000)}s`
  );
}

/**
 * Cancel a timer for a queue
 */
export function cancelQueueTimer(messageId: string): void {
  const timerId = activeTimers.get(messageId);

  if (timerId) {
    clearTimeout(timerId);
    activeTimers.delete(messageId);
    console.log(`[Timer] Cancelled timer for queue ${messageId}`);
  }
}

/**
 * Handle queue expiration
 * Called when the timer expires
 */
export async function handleQueueExpiration(
  messageId: string,
  client: Client
): Promise<void> {
  // Remove from active timers
  activeTimers.delete(messageId);

  // Load queue from database
  const queue = Queue.load(messageId);

  if (!queue) {
    console.log(`[Timer] Queue ${messageId} not found, skipping expiration`);
    return;
  }

  // Skip if already closed
  if (queue.isClosed()) {
    console.log(`[Timer] Queue ${messageId} already closed, skipping expiration`);
    return;
  }

  console.log(`[Timer] Queue ${messageId} expired, closing...`);

  try {
    // 1. Close the queue in database
    queue.close();

    // 2. Get channel and message
    const channel = await client.channels.fetch(queue.getChannelId());
    if (!channel || !channel.isTextBased()) {
      console.error(`[Timer] Channel ${queue.getChannelId()} not found or not text-based`);
      return;
    }

    const textChannel = channel as TextChannel;
    const message = await textChannel.messages.fetch(messageId);

    if (!message) {
      console.error(`[Timer] Message ${messageId} not found`);
      return;
    }

    // 3. Send notification pinging all players
    await sendQueueExpiredNotification(queue, textChannel);

    // 4. Update embed to show closed state
    const guild = await client.guilds.fetch(queue.getGuildId());
    const state = queue.getState();
    const embed = createQueueEmbed(state, guild.name, queue.getGuildId());
    const buttons = createDisabledButtons(queue.getGuildId());

    await message.edit({
      embeds: [embed],
      components: [buttons],
    });

    console.log(`[Timer] Queue ${messageId} closed successfully`);
  } catch (error) {
    console.error(`[Timer] Error handling queue expiration for ${messageId}:`, error);
  }
}

/**
 * Send a notification when queue timer expires
 */
async function sendQueueExpiredNotification(
  queue: Queue,
  channel: TextChannel
): Promise<void> {
  const state = queue.getState();
  const playerIds = state.players.map((p) => p.userId);
  const t = getGuildTranslations(queue.getGuildId());

  // Get localized queue name
  const queueTypeName =
    queue.getQueueType() === 'sword_trial'
      ? t.queueTypes.swordTrial
      : queue.getQueueType() === 'hero_realm'
        ? t.queueTypes.heroRealm
        : t.queueTypes.guildWar;

  // Only send if there are players to ping
  if (playerIds.length > 0) {
    const playerMentions = formatPlayerMentions(playerIds);
    const message = t.queueExpiredMessage(queueTypeName, playerMentions);

    await channel.send({
      content: message,
      allowedMentions: { users: playerIds },
    });
  }
}

/**
 * Restore timers for all open, unexpired queues
 * Called on bot startup
 */
export async function restoreTimers(client: Client): Promise<void> {
  const allQueues = Queue.loadAll();
  let restored = 0;
  let expired = 0;

  for (const queue of allQueues) {
    // Skip closed queues
    if (queue.isClosed()) {
      continue;
    }

    // Check if expired
    if (queue.isExpired()) {
      // Handle expiration immediately
      await handleQueueExpiration(queue.getMessageId(), client);
      expired++;
    } else {
      // Start timer with remaining time
      startQueueTimer(queue, client);
      restored++;
    }
  }

  console.log(`[Timer] Restored ${restored} timers, processed ${expired} expired queues`);
}

/**
 * Get the number of active timers
 * For debugging/monitoring
 */
export function getActiveTimerCount(): number {
  return activeTimers.size;
}

/**
 * Clear all active timers
 * Used during shutdown
 */
export function clearAllTimers(): void {
  for (const [_messageId, timerId] of activeTimers) {
    clearTimeout(timerId);
  }
  activeTimers.clear();
  console.log('[Timer] Cleared all active timers');
}
