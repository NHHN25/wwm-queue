/**
 * Type definitions for Where Winds Meet Queue Bot
 */

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Supported queue types
 */
export type QueueType = 'sword_trial' | 'hero_realm';

/**
 * Player role types
 */
export type PlayerRole = 'tank' | 'healer' | 'dps';

/**
 * Queue configuration
 */
export interface QueueConfig {
  type: QueueType;
  capacity: number;
  displayName: string;
  emoji: string;
  color: number; // Hex color for Discord embed
}

// ============================================================================
// Data Models
// ============================================================================

/**
 * Queue metadata (from database)
 */
export interface QueueData {
  messageId: string;
  guildId: string;
  channelId: string;
  queueType: QueueType;
  capacity: number;
  createdAt: Date;
}

/**
 * Player entry in a queue (from database)
 */
export interface QueuePlayerData {
  userId: string;
  username: string;
  role: PlayerRole;
  joinedAt: Date;
}

/**
 * Complete queue state (queue + players)
 * Used for rendering embeds and business logic
 */
export interface QueueState {
  queue: QueueData;
  players: QueuePlayerData[];
}

// ============================================================================
// Button Interaction Data
// ============================================================================

/**
 * Parsed button custom_id data
 */
export interface ButtonInteractionData {
  action: 'join' | 'leave';
  role?: PlayerRole; // Only present for join actions
}

// ============================================================================
// Command Options
// ============================================================================

/**
 * Options for /setup command
 */
export interface SetupCommandOptions {
  queueType: QueueType;
  channelId?: string; // Optional, defaults to current channel
}

/**
 * Options for /reset and /close commands
 */
export interface QueueManagementOptions {
  queueType: QueueType;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error for queue operations
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly code: QueueErrorCode,
    public readonly isUserError: boolean = true
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

/**
 * Error codes for queue operations
 */
export enum QueueErrorCode {
  // User errors (show as ephemeral messages)
  QUEUE_NOT_FOUND = 'QUEUE_NOT_FOUND',
  QUEUE_FULL = 'QUEUE_FULL',
  PLAYER_ALREADY_IN_QUEUE = 'PLAYER_ALREADY_IN_QUEUE',
  PLAYER_IN_ANOTHER_QUEUE = 'PLAYER_IN_ANOTHER_QUEUE',
  PLAYER_NOT_IN_QUEUE = 'PLAYER_NOT_IN_QUEUE',
  QUEUE_ALREADY_EXISTS = 'QUEUE_ALREADY_EXISTS',

  // Permission errors
  MISSING_PERMISSIONS = 'MISSING_PERMISSIONS',
  NOT_ADMIN = 'NOT_ADMIN',

  // System errors (log and show generic error)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DISCORD_API_ERROR = 'DISCORD_API_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Role display configuration
 */
export interface RoleConfig {
  emoji: string;
  displayName: string;
  color: number;
}

/**
 * Guild configuration (future use)
 */
export interface GuildConfig {
  guildId: string;
  guildName: string;
  adminRoleIds: string[];
  settings: {
    allowMultipleQueues: boolean;
    queueCooldownSeconds: number;
    afkCheckEnabled: boolean;
  };
}
