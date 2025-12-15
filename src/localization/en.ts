import type { Translations } from './types.js';

/**
 * English translations
 */
export const en: Translations = {
  embeds: {
    queueEmpty: 'WAITING FOR PLAYERS',
    beTheFirst: '💡 **Be the first to join!**',
    clickRole: 'Click a role button below to start the queue',
    partyRoster: 'PARTY ROSTER',
    openSlot: 'OPEN SLOT',
    queueComplete: 'QUEUE COMPLETE! READY TO START!',
    queueProgress: '📊 Queue Progress',
    empty: 'Empty',
    full: 'FULL!',
    players: 'Players',
    partyFinder: 'Party Finder',
  },

  footers: {
    queueEmpty: 'Click a role button to join the queue',
    queueActive: 'Queue is filling up! Join now',
    queueFull: 'Queue is ready! Good luck!',
  },

  buttons: {
    leave: '❌ Leave',
  },

  success: {
    queueCreated: (queueType: string, channel: string) =>
      `✅ Successfully created **${queueType}** queue in ${channel}!\n\nPlayers can now join using the role buttons.`,
    queueReset: (queueType: string) =>
      `✅ The **${queueType}** queue has been cleared.\n\nAll players have been removed from the queue.`,
    queueClosed: (queueType: string) =>
      `✅ The **${queueType}** queue has been closed and removed.`,
    joinedQueue: (role: string) =>
      `✅ You joined the queue as ${role}!\n\n💡 *Click a different role to switch, or click ❌ Leave to exit the queue.*`,
    switchedRole: (role: string) => `🔄 You switched to ${role}!`,
    leftQueue: `✅ You left the queue.`,
    languageChanged: (language: string) =>
      `✅ Language changed to **${language}**.`,
  },

  errors: {
    genericError:
      '❌ An error occurred. Please try again or contact an administrator.',
    queueNotFound:
      '❌ Queue not found. It may have been deleted or does not exist.',
    queueFull: '❌ The queue is full! Please wait for the next round.',
    queueAlreadyExists:
      '❌ A queue of this type already exists in this server. Use `/reset` to clear it or `/close` to delete it.',
    playerAlreadyInQueue:
      '❌ You are already in this queue! Click a different role to switch, or click ❌ Leave to exit.',
    playerInAnotherQueue:
      '❌ You are already in another queue in this server. Please leave that queue first.',
    playerNotInQueue:
      '❌ You are not in the queue. Click a role button to join!',
    invalidChannel: '❌ Invalid channel. Please select a text channel.',
    missingPermissions: (permissions: string[]) =>
      `❌ I'm missing these permissions:\n${permissions.map((p) => `• ${p}`).join('\n')}\n\nPlease grant these permissions and try again.`,
  },

  queueFullMessage: (queueType: string, mentions: string) =>
    `🎉 **${queueType} Queue is Full!**\n\n${mentions}\n\nYour party is ready! Good luck and have fun!`,

  commands: {
    setup: {
      description: 'Create a queue for Where Winds Meet activities',
      swordTrial: 'Create a Sword Trial queue (5 players)',
      heroRealm: 'Create a Hero Realm queue (10 players)',
      channelOption: 'Channel for the queue (default: current channel)',
    },
    reset: {
      description: 'Clear all players from a queue',
      queueTypeOption: 'Which queue to reset',
    },
    close: {
      description: 'Delete a queue completely',
      queueTypeOption: 'Which queue to close',
    },
    language: {
      description: 'Change the bot language',
      languageOption: 'Select a language',
    },
  },

  queueTypes: {
    swordTrial: 'Sword Trial',
    heroRealm: 'Hero Realm',
  },
};
