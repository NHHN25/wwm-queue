/**
 * Type definitions for Where Winds Meet Queue Bot
 */

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Supported queue types
 */
export type QueueType = 'sword_trial' | 'hero_realm' | 'guild_war';

/**
 * Player role types
 */
export type PlayerRole = 'tank' | 'healer' | 'dps';

/**
 * Guild War team types
 */
export type GuildWarTeam = 'jungler' | 'offense' | 'defense';

/**
 * Queue status types
 */
export type QueueStatus = 'open' | 'closed';

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
  status: QueueStatus;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Player entry in a queue (from database)
 */
export interface QueuePlayerData {
  userId: string;
  username: string;
  role: PlayerRole;
  team?: GuildWarTeam | null;
  joinedAt: Date;
  // Optional player stats from player_registrations table
  gearScore?: number | null;
  arenaRank?: string | null;
  ingameName?: string | null;
  primaryWeapon?: WeaponName | null;
  secondaryWeapon?: WeaponName | null;
}

/**
 * Complete queue state (queue + players)
 * Used for rendering embeds and business logic
 */
export interface QueueState {
  queue: QueueData;
  players: QueuePlayerData[];
}

/**
 * Panel metadata (from database)
 * Panels are persistent "Create Queue" embeds posted by admins via /setup
 */
export interface PanelData {
  messageId: string;
  guildId: string;
  channelId: string;
  queueType: QueueType;
  createdAt: Date;
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
  QUEUE_CLOSED = 'QUEUE_CLOSED',
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
export type WeaponType = 'sword' | 'spear' | 'dual_blades' | 'thundercry_blade' | 'fans' | 'umbrella' | 'rope_dart' | 'gauntlets';

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
  // Thundercry Blade
  | 'thundercry_blade'
  // Fans
  | 'panacea_fan'
  | 'inkwell_fan'
  // Umbrellas
  | 'soulshade_umbrella'
  | 'vernal_umbrella'
  | 'everspring_umbrella'
  // Rope Darts
  | 'mortal_rope_dart'
  | 'unfettered_rope_dart'
  | 'skygrasp_rope_dart'
  // Blades
  | 'snowparting_blade'
  | 'phalanxbane_blade'
  // Gauntlets
  | 'heavenwill_gauntlets';

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
  approved_channel_id: string | null;
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

// ============================================================================
// Guild War (Bang Chien) Scheduled Events
// ============================================================================

/**
 * Teams available in a scheduled Guild War.
 * Narrower than GuildWarTeam: scheduled wars use offense/defense only.
 */
export type GuildWarSide = 'offense' | 'defense';

/**
 * Which weekend day an event falls on
 */
export type GuildWarDay = 'sat' | 'sun';

/**
 * Event lifecycle:
 * open      - accepting signups
 * locked    - main ping sent, roster frozen
 * done      - event finished
 * cancelled - called off by an admin
 */
export type GuildWarEventStatus = 'open' | 'locked' | 'done' | 'cancelled';

/**
 * Player's response to the reminder ping
 */
export type GuildWarAttendance = 'unknown' | 'confirmed' | 'declined';

/**
 * Per-guild Guild War configuration
 */
export interface GuildWarSettings {
  guildId: string;
  registrationChannelId: string | null;
  announceChannelId: string | null;
  timezone: string;
  satTime: string; // HH:MM, local to timezone
  sunTime: string; // HH:MM, local to timezone
  openWeekday: number; // ISO weekday, 4 = Thursday
  openTime: string; // HH:MM, local to timezone
  autoOpen: boolean;
  notifyLeadMin: number;
  nudgeLeadMin: number;
  capacity: number;
  teamOffenseName: string | null;
  teamDefenseName: string | null;
  lastAutoOpenAt: Date | null;
}

/**
 * A single Guild War occurrence
 */
export interface GuildWarEvent {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  day: GuildWarDay;
  eventAt: Date;
  notifyAt: Date;
  nudgeAt: Date;
  notifiedAt: Date | null;
  nudgedAt: Date | null;
  capacity: number;
  status: GuildWarEventStatus;
  createdAt: Date;
}

/**
 * A player signed up for a Guild War event
 */
export interface GuildWarSignup {
  id: number;
  eventId: number;
  userId: string;
  username: string;
  team: GuildWarSide;
  role: PlayerRole;
  attendance: GuildWarAttendance;
  assignedBy: string | null; // Admin who moved this player, null if self-selected
  joinedAt: Date;
}

/**
 * The parts of a player's registration shown on a Guild War roster
 */
export interface GuildWarProfile {
  ingameName: string;
  primaryWeapon: WeaponName;
  secondaryWeapon: WeaponName;
}

/**
 * Event plus its roster, for rendering embeds and pings
 */
export interface GuildWarEventState {
  event: GuildWarEvent;
  signups: GuildWarSignup[];
}

// ============================================================================
// Guild War Database Rows
// ============================================================================

/**
 * Database row for guild_war_settings table
 */
export interface GuildWarSettingsRow {
  guild_id: string;
  registration_channel_id: string | null;
  announce_channel_id: string | null;
  timezone: string;
  sat_time: string;
  sun_time: string;
  open_weekday: number;
  open_time: string;
  auto_open: number; // SQLite boolean (0 or 1)
  notify_lead_min: number;
  nudge_lead_min: number;
  capacity: number;
  team_offense_name: string | null;
  team_defense_name: string | null;
  last_auto_open_at: string | null;
  updated_at: string;
}

/**
 * Database row for guild_war_events table
 */
export interface GuildWarEventRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  day: GuildWarDay;
  event_at: string;
  notify_at: string;
  nudge_at: string;
  notified_at: string | null;
  nudged_at: string | null;
  capacity: number;
  status: GuildWarEventStatus;
  created_at: string;
}

/**
 * Database row for guild_war_signups table
 */
export interface GuildWarSignupRow {
  id: number;
  event_id: number;
  user_id: string;
  username: string;
  team: GuildWarSide;
  role: PlayerRole;
  attendance: GuildWarAttendance;
  assigned_by: string | null;
  joined_at: string;
  updated_at: string;
}
