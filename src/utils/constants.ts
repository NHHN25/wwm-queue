import type { QueueType, QueueConfig, PlayerRole, RoleConfig } from '../types/index.js';

/**
 * Queue type configurations
 */
export const QUEUE_CONFIGS: Record<QueueType, QueueConfig> = {
  sword_trial: {
    type: 'sword_trial',
    capacity: 5,
    displayName: 'Sword Trial',
    emoji: '🗡️',
    color: 0x3498db, // Blue
  },
  hero_realm: {
    type: 'hero_realm',
    capacity: 10,
    displayName: 'Hero Realm',
    emoji: '🏰',
    color: 0xe74c3c, // Red
  },
};

/**
 * Role configurations
 */
export const ROLE_CONFIGS: Record<PlayerRole, RoleConfig> = {
  tank: {
    emoji: '🛡️',
    displayName: 'Tank',
    color: 0x3498db, // Blue
  },
  healer: {
    emoji: '💚',
    displayName: 'Healer',
    color: 0x2ecc71, // Green
  },
  dps: {
    emoji: '⚔️',
    displayName: 'DPS',
    color: 0xe74c3c, // Red
  },
};

/**
 * Emoji constants
 */
export const EMOJIS = {
  // Queue status
  EMPTY_SLOT: '⬜',
  FULL_QUEUE: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ️',

  // Roles (quick access)
  TANK: ROLE_CONFIGS.tank.emoji,
  HEALER: ROLE_CONFIGS.healer.emoji,
  DPS: ROLE_CONFIGS.dps.emoji,

  // Queue types (quick access)
  SWORD_TRIAL: QUEUE_CONFIGS.sword_trial.emoji,
  HERO_REALM: QUEUE_CONFIGS.hero_realm.emoji,

  // Actions
  PARTY: '🎉',
  CLOCK: '⏰',
  USERS: '👥',
} as const;

/**
 * Discord color constants (hex)
 */
export const COLORS = {
  PRIMARY: 0x5865f2, // Discord Blurple
  SUCCESS: 0x57f287, // Green
  WARNING: 0xfee75c, // Yellow
  DANGER: 0xed4245, // Red
  INFO: 0x5865f2, // Blue
  EMBED_BACKGROUND: 0x2b2d31, // Dark gray
} as const;

/**
 * Button custom ID prefixes
 */
export const BUTTON_IDS = {
  JOIN_TANK: 'queue_join_tank',
  JOIN_HEALER: 'queue_join_healer',
  JOIN_DPS: 'queue_join_dps',
  LEAVE: 'queue_leave',
} as const;

/**
 * Command names
 */
export const COMMANDS = {
  SETUP: 'setup',
  RESET: 'reset',
  CLOSE: 'close',
} as const;

/**
 * Error messages (user-facing)
 */
export const ERROR_MESSAGES = {
  QUEUE_NOT_FOUND: '❌ This queue no longer exists.',
  QUEUE_FULL: '❌ This queue is full! Please wait for the next one.',
  PLAYER_ALREADY_IN_QUEUE: '❌ You are already in this queue!',
  PLAYER_IN_ANOTHER_QUEUE:
    '❌ You are already in another queue! Leave that queue first.',
  PLAYER_NOT_IN_QUEUE: '❌ You are not in this queue.',
  QUEUE_ALREADY_EXISTS: '❌ A queue of this type already exists in this server.',
  MISSING_PERMISSIONS:
    '❌ I don\'t have the required permissions in this channel. Please ensure I have: Send Messages, Embed Links, Read Message History, and Manage Messages.',
  NOT_ADMIN: '❌ Only administrators can use this command.',
  GENERIC_ERROR:
    '❌ An error occurred while processing your request. Please try again or contact an admin.',
} as const;

/**
 * Success messages (user-facing)
 */
export const SUCCESS_MESSAGES = {
  QUEUE_CREATED: (queueType: QueueType, channelMention: string) =>
    `✅ ${QUEUE_CONFIGS[queueType].displayName} queue created in ${channelMention}!`,
  QUEUE_RESET: (queueType: QueueType) =>
    `✅ ${QUEUE_CONFIGS[queueType].displayName} queue has been reset!`,
  QUEUE_CLOSED: (queueType: QueueType) =>
    `✅ ${QUEUE_CONFIGS[queueType].displayName} queue has been closed!`,
  JOINED_QUEUE: (role: PlayerRole) =>
    `✅ You joined as ${ROLE_CONFIGS[role].emoji} ${ROLE_CONFIGS[role].displayName}!`,
  LEFT_QUEUE: '✅ You left the queue.',
} as const;

/**
 * Queue full notification message
 */
export const QUEUE_FULL_MESSAGE = (
  queueType: QueueType,
  playerMentions: string
) => {
  return `${EMOJIS.PARTY} **${QUEUE_CONFIGS[queueType].displayName}** queue is full!\n\n${playerMentions}\n\nThe queue is ready to start!`;
};

/**
 * Embed footer texts
 */
export const EMBED_FOOTERS = {
  QUEUE_EMPTY: 'Click a role button to join the queue!',
  QUEUE_ACTIVE: 'Players are listed in join order',
  QUEUE_FULL: 'Queue is full! Starting soon...',
} as const;

/**
 * Embed field names
 */
export const EMBED_FIELDS = {
  PLAYERS: 'Players',
  ROSTER: 'Roster',
  STATUS: 'Status',
} as const;

/**
 * Bot configuration
 */
export const BOT_CONFIG = {
  // Maximum time for interaction response (Discord limit: 3 seconds)
  INTERACTION_TIMEOUT_MS: 2500,

  // Database settings
  DB_WAL_MODE: true,
  DB_FOREIGN_KEYS: true,

  // Logging
  LOG_QUEUE_OPERATIONS: process.env.NODE_ENV === 'development',
  LOG_USER_IDS: process.env.NODE_ENV === 'development', // GDPR: don't log in production

  // Future features (placeholders)
  ENABLE_AFK_CHECK: false,
  QUEUE_COOLDOWN_SECONDS: 0,
  MAX_QUEUES_PER_TYPE: 1,
} as const;

/**
 * Required Discord permissions for the bot
 */
export const REQUIRED_PERMISSIONS = [
  'SendMessages',
  'EmbedLinks',
  'ReadMessageHistory',
] as const;

/**
 * Optional Discord permissions (recommended)
 */
export const OPTIONAL_PERMISSIONS = ['ManageMessages', 'MentionEveryone'] as const;

/**
 * Get display name for a queue type
 */
export function getQueueDisplayName(queueType: QueueType): string {
  return QUEUE_CONFIGS[queueType].displayName;
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: PlayerRole): string {
  return ROLE_CONFIGS[role].displayName;
}

/**
 * Get emoji for a queue type
 */
export function getQueueEmoji(queueType: QueueType): string {
  return QUEUE_CONFIGS[queueType].emoji;
}

/**
 * Get emoji for a role
 */
export function getRoleEmoji(role: PlayerRole): string {
  return ROLE_CONFIGS[role].emoji;
}

/**
 * Parse button custom ID to extract action and role
 */
export function parseButtonId(customId: string): {
  action: 'join' | 'leave';
  role?: PlayerRole;
} | null {
  if (customId === BUTTON_IDS.LEAVE) {
    return { action: 'leave' };
  }

  if (customId === BUTTON_IDS.JOIN_TANK) {
    return { action: 'join', role: 'tank' };
  }

  if (customId === BUTTON_IDS.JOIN_HEALER) {
    return { action: 'join', role: 'healer' };
  }

  if (customId === BUTTON_IDS.JOIN_DPS) {
    return { action: 'join', role: 'dps' };
  }

  return null;
}
