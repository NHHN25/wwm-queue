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

// ============================================================================
// Player Registration Types
// ============================================================================

/**
 * Weapon types available in Where Winds Meet
 */
export type WeaponType = 'sword' | 'spear' | 'dual_blades' | 'mo_dao' | 'fans' | 'umbrella' | 'rope_dart';

/**
 * Specific weapon names in Where Winds Meet
 */
export type WeaponName =
  // Swords
  | 'strategic_sword'
  | 'nameless_sword'
  // Spears
  | 'stormbreaker_spear'
  | 'heavenquaker_spear'
  | 'nameless_spear'
  // Dual Blades / Twinblades
  | 'infernal_twinblades'
  // Mo Dao
  | 'mo_dao'
  // Fans
  | 'panacea_fan'
  | 'inkwell_fan'
  // Umbrellas
  | 'soulshade_umbrella'
  | 'vernal_umbrella'
  // Rope Darts
  | 'mortal_rope_dart';

/**
 * Approval status for registrations
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Database row for player_registrations table
 */
export interface PlayerRegistrationRow {
  id: number;
  guild_id: string;
  user_id: string;
  ingame_name: string;
  ingame_uid: string;
  gear_score: number;
  arena_rank: string;
  primary_weapon: WeaponName;
  secondary_weapon: WeaponName;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Registration channel data
 */
export interface RegistrationChannelRow {
  guild_id: string;
  channel_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Weapon display configuration
 */
export interface WeaponConfig {
  name: WeaponName;
  type: WeaponType;
  emoji: string;
  displayNameEn: string;
  displayNameVi: string;
}

// ============================================================================
// Verification System Types
// ============================================================================

/**
 * Database row for verification_settings table
 */
export interface VerificationSettingsRow {
  guild_id: string;
  pending_role_id: string | null;
  approved_role_id: string | null;
  review_channel_id: string;
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

/**
 * Database row for pending_registrations table
 */
export interface PendingRegistrationRow {
  id: number;
  guild_id: string;
  user_id: string;
  review_message_id: string;
  registration_id: number;
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}
