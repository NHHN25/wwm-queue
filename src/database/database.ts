import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database instance (singleton)
let db: Database.Database | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || './data/queues.db';
    const dbDir = dirname(dbPath);

    // Ensure data directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Enable WAL mode for better concurrency (optional but recommended)
    db.pragma('journal_mode = WAL');

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
  }

  return db;
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  const db = getDatabase();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema (creates tables and indexes if they don't exist)
  db.exec(schema);

  // Run migrations for existing databases
  runMigrations();

  console.log('[Database] Schema initialized successfully');
}

/**
 * Run database migrations for schema updates
 */
function runMigrations(): void {
  const db = getDatabase();

  try {
    // Migration: Add approved_channel_id to verification_settings (if not exists)
    const hasApprovedChannelColumn = db
      .prepare(
        `SELECT COUNT(*) as count FROM pragma_table_info('verification_settings') WHERE name='approved_channel_id'`
      )
      .get() as { count: number };

    if (hasApprovedChannelColumn.count === 0) {
      db.exec(`
        ALTER TABLE verification_settings
        ADD COLUMN approved_channel_id TEXT;
      `);
      console.log('[Database] Migration: Added approved_channel_id column to verification_settings');
    }

    // Migration: Add status column to queues table (if not exists)
    const hasStatusColumn = db
      .prepare(
        `SELECT COUNT(*) as count FROM pragma_table_info('queues') WHERE name='status'`
      )
      .get() as { count: number };

    if (hasStatusColumn.count === 0) {
      db.exec(`
        ALTER TABLE queues
        ADD COLUMN status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed'));
      `);
      console.log('[Database] Migration: Added status column to queues');
    }

    // Migration: Add expires_at column to queues table (if not exists)
    const hasExpiresAtColumn = db
      .prepare(
        `SELECT COUNT(*) as count FROM pragma_table_info('queues') WHERE name='expires_at'`
      )
      .get() as { count: number };

    if (hasExpiresAtColumn.count === 0) {
      db.exec(`
        ALTER TABLE queues
        ADD COLUMN expires_at DATETIME;
      `);
      console.log('[Database] Migration: Added expires_at column to queues');
    }

    // Migration: Update queue_type CHECK constraint to include 'guild_war'
    // Check if the constraint needs updating by attempting to insert a guild_war queue (rollback after)
    try {
      db.exec('BEGIN TRANSACTION');
      db.exec(`
        INSERT INTO queues (message_id, guild_id, channel_id, queue_type, capacity)
        VALUES ('migration_test', 'test_guild', 'test_channel', 'guild_war', 30)
      `);
      db.exec('ROLLBACK');
      console.log('[Database] Migration: guild_war queue type already supported');
    } catch (constraintError: any) {
      // Constraint violation means we need to migrate
      db.exec('ROLLBACK');
      if (constraintError.message && constraintError.message.includes('CHECK constraint failed')) {
        console.log('[Database] Migration: Updating queue_type CHECK constraint for guild_war...');

        // SQLite requires table recreation to modify CHECK constraints
        db.exec(`
          PRAGMA foreign_keys=OFF;

          -- Create new table with updated constraint
          CREATE TABLE queues_new (
            message_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            queue_type TEXT NOT NULL
              CHECK(queue_type IN ('sword_trial', 'hero_realm', 'guild_war')),
            capacity INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Copy existing data
          INSERT INTO queues_new SELECT * FROM queues;

          -- Drop old table and rename new one
          DROP TABLE queues;
          ALTER TABLE queues_new RENAME TO queues;

          -- Recreate indexes
          CREATE INDEX IF NOT EXISTS idx_queues_guild ON queues(guild_id);
          CREATE INDEX IF NOT EXISTS idx_queues_type ON queues(guild_id, queue_type);

          PRAGMA foreign_keys=ON;
        `);

        console.log('[Database] Migration: Updated queue_type constraint for guild_war');
      }
    }
  } catch (error) {
    console.error('[Database] Migration error:', error);
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Connection closed');
  }
}

// ============================================================================
// Queue Operations
// ============================================================================

export interface QueueRow {
  message_id: string;
  guild_id: string;
  channel_id: string;
  queue_type: 'sword_trial' | 'hero_realm' | 'guild_war';
  capacity: number;
  status: 'open' | 'closed';
  expires_at: string | null;
  created_at: string;
}

/**
 * Create a new queue
 */
export function createQueue(
  messageId: string,
  guildId: string,
  channelId: string,
  queueType: 'sword_trial' | 'hero_realm' | 'guild_war',
  capacity: number,
  expiresAt: Date | null = null
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO queues (message_id, guild_id, channel_id, queue_type, capacity, status, expires_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `);

  const expiresAtStr = expiresAt ? expiresAt.toISOString() : null;
  stmt.run(messageId, guildId, channelId, queueType, capacity, expiresAtStr);
}

/**
 * Get queue by message ID
 */
export function getQueue(messageId: string): QueueRow | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM queues WHERE message_id = ?');
  return (stmt.get(messageId) as QueueRow) || null;
}

/**
 * Get queue by guild ID and queue type
 */
export function getQueueByType(
  guildId: string,
  queueType: 'sword_trial' | 'hero_realm' | 'guild_war'
): QueueRow | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM queues
    WHERE guild_id = ? AND queue_type = ?
  `);
  return (stmt.get(guildId, queueType) as QueueRow) || null;
}

/**
 * Get all queues for a guild
 */
export function getGuildQueues(guildId: string): QueueRow[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM queues WHERE guild_id = ?');
  return stmt.all(guildId) as QueueRow[];
}

/**
 * Get all queues across all guilds
 */
export function getAllQueues(): QueueRow[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM queues');
  return stmt.all() as QueueRow[];
}

/**
 * Delete a queue (cascade deletes all players)
 */
export function deleteQueue(messageId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM queues WHERE message_id = ?');
  stmt.run(messageId);
}

/**
 * Close a queue (set status to 'closed')
 */
export function closeQueue(messageId: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE queues SET status = 'closed' WHERE message_id = ?
  `);
  stmt.run(messageId);
}

/**
 * Reopen a queue and reset the expiration timer
 * Used by /reset command
 */
export function reopenQueue(messageId: string, expiresAt: Date): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE queues SET status = 'open', expires_at = ? WHERE message_id = ?
  `);
  stmt.run(expiresAt.toISOString(), messageId);
}

// ============================================================================
// Queue Player Operations
// ============================================================================

export interface QueuePlayerRow {
  id: number;
  message_id: string;
  user_id: string;
  username: string;
  role: 'tank' | 'healer' | 'dps';
  joined_at: string;
}

/**
 * Add a player to a queue
 * Returns true if successful, false if player already in queue
 */
export function addPlayer(
  messageId: string,
  userId: string,
  username: string,
  role: 'tank' | 'healer' | 'dps'
): boolean {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      INSERT INTO queue_players (message_id, user_id, username, role)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(messageId, userId, username, role);
    return true;
  } catch (error: any) {
    // UNIQUE constraint violation (user already in queue)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return false;
    }
    throw error;
  }
}

/**
 * Remove a player from a queue
 * Returns true if player was removed, false if not in queue
 */
export function removePlayer(messageId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM queue_players
    WHERE message_id = ? AND user_id = ?
  `);

  const result = stmt.run(messageId, userId);
  return result.changes > 0;
}

/**
 * Get all players in a queue (ordered by join time)
 */
export function getQueuePlayers(messageId: string): QueuePlayerRow[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM queue_players
    WHERE message_id = ?
    ORDER BY joined_at ASC
  `);

  return stmt.all(messageId) as QueuePlayerRow[];
}

/**
 * Get player count for a queue
 */
export function getQueuePlayerCount(messageId: string): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM queue_players
    WHERE message_id = ?
  `);

  const result = stmt.get(messageId) as { count: number };
  return result.count;
}

/**
 * Check if a player is in a specific queue
 */
export function isPlayerInQueue(messageId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 1 FROM queue_players
    WHERE message_id = ? AND user_id = ?
  `);

  return stmt.get(messageId, userId) !== undefined;
}

/**
 * Check if a player is in any queue for a guild
 * Returns the message ID of the queue they're in, or null if not in any queue
 */
export function getPlayerQueueInGuild(
  guildId: string,
  userId: string
): string | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT qp.message_id
    FROM queue_players qp
    JOIN queues q ON qp.message_id = q.message_id
    WHERE q.guild_id = ? AND qp.user_id = ?
  `);

  const result = stmt.get(guildId, userId) as { message_id: string } | undefined;
  return result?.message_id || null;
}

/**
 * Clear all players from a queue
 */
export function clearQueuePlayers(messageId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM queue_players WHERE message_id = ?');
  stmt.run(messageId);
}

/**
 * Get queue statistics for a user across all queues
 */
export function getUserQueueStats(userId: string): {
  totalJoins: number;
  tankJoins: number;
  healerJoins: number;
  dpsJoins: number;
} {
  const db = getDatabase();

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count FROM queue_players WHERE user_id = ?
  `);
  const total = (totalStmt.get(userId) as { count: number }).count;

  const roleStmt = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM queue_players
    WHERE user_id = ?
    GROUP BY role
  `);
  const roleCounts = roleStmt.all(userId) as { role: string; count: number }[];

  const stats = {
    totalJoins: total,
    tankJoins: 0,
    healerJoins: 0,
    dpsJoins: 0,
  };

  roleCounts.forEach((rc) => {
    if (rc.role === 'tank') stats.tankJoins = rc.count;
    if (rc.role === 'healer') stats.healerJoins = rc.count;
    if (rc.role === 'dps') stats.dpsJoins = rc.count;
  });

  return stats;
}

/**
 * Get all players in a queue with their registration stats (gear score, arena rank)
 * Uses LEFT JOIN to include players without registration data
 */
export function getQueuePlayersWithStats(messageId: string): Array<QueuePlayerRow & {
  gear_score: number | null;
  arena_rank: string | null;
  ingame_name: string | null;
}> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT
      qp.id,
      qp.message_id,
      qp.user_id,
      qp.username,
      qp.role,
      qp.joined_at,
      pr.gear_score,
      pr.arena_rank,
      pr.ingame_name
    FROM queue_players qp
    LEFT JOIN player_registrations pr
      ON qp.user_id = pr.user_id
      AND pr.guild_id = (SELECT guild_id FROM queues WHERE message_id = qp.message_id)
      AND pr.approval_status = 'approved'
    WHERE qp.message_id = ?
    ORDER BY qp.joined_at ASC
  `);

  return stmt.all(messageId) as Array<QueuePlayerRow & {
    gear_score: number | null;
    arena_rank: string | null;
    ingame_name: string | null;
  }>;
}

// ============================================================================
// Guild Settings Operations
// ============================================================================

/**
 * Get guild's preferred language
 * Returns null if no preference is set (defaults to 'en' in the application layer)
 */
export function getGuildLanguage(guildId: string): 'en' | 'vi' | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT language FROM guild_settings
    WHERE guild_id = ?
  `);

  const result = stmt.get(guildId) as { language: 'en' | 'vi' } | undefined;
  return result?.language || null;
}

/**
 * Set guild's preferred language
 * Creates or updates the guild settings
 */
export function setGuildLanguage(
  guildId: string,
  language: 'en' | 'vi'
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO guild_settings (guild_id, language, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET
      language = excluded.language,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(guildId, language);
  return result.changes > 0;
}

// ============================================================================
// Player Registration Operations
// ============================================================================

/**
 * Create or update player registration (UPSERT)
 * Returns true if successful, false otherwise
 */
export function upsertPlayerRegistration(
  guildId: string,
  userId: string,
  ingameName: string,
  ingameUid: string,
  gearScore: number,
  arenaRank: string,
  primaryWeapon: string,
  secondaryWeapon: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO player_registrations
      (guild_id, user_id, ingame_name, ingame_uid, gear_score, arena_rank, primary_weapon, secondary_weapon, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      ingame_name = excluded.ingame_name,
      ingame_uid = excluded.ingame_uid,
      gear_score = excluded.gear_score,
      arena_rank = excluded.arena_rank,
      primary_weapon = excluded.primary_weapon,
      secondary_weapon = excluded.secondary_weapon,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(
    guildId,
    userId,
    ingameName,
    ingameUid,
    gearScore,
    arenaRank,
    primaryWeapon,
    secondaryWeapon
  );
  return result.changes > 0;
}

/**
 * Get player registration by user ID
 * Returns null if not found
 */
export function getPlayerRegistration(
  guildId: string,
  userId: string
): import('../types/index.js').PlayerRegistrationRow | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM player_registrations
    WHERE guild_id = ? AND user_id = ?
  `);

  return (
    (stmt.get(guildId, userId) as
      | import('../types/index.js').PlayerRegistrationRow
      | undefined) || null
  );
}

/**
 * Check if player is registered
 */
export function isPlayerRegistered(guildId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 1 FROM player_registrations
    WHERE guild_id = ? AND user_id = ?
  `);

  return stmt.get(guildId, userId) !== undefined;
}

/**
 * Delete player registration
 * Returns true if deleted, false if not found
 */
export function deletePlayerRegistration(
  guildId: string,
  userId: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM player_registrations
    WHERE guild_id = ? AND user_id = ?
  `);

  const result = stmt.run(guildId, userId);
  return result.changes > 0;
}

/**
 * Update only gear score and arena rank (quick update)
 * Returns true if successful
 */
export function updatePlayerStats(
  guildId: string,
  userId: string,
  gearScore: number,
  arenaRank: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE player_registrations
    SET gear_score = ?, arena_rank = ?, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND user_id = ?
  `);

  const result = stmt.run(gearScore, arenaRank, guildId, userId);
  return result.changes > 0;
}

// ============================================================================
// Registration Channel Operations
// ============================================================================

/**
 * Set registration channel for a guild (UPSERT)
 * Returns true if successful
 */
export function setRegistrationChannel(
  guildId: string,
  channelId: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO registration_channels (guild_id, channel_id, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(guildId, channelId);
  return result.changes > 0;
}

/**
 * Get registration channel for a guild
 * Returns null if not set
 */
export function getRegistrationChannel(guildId: string): string | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT channel_id FROM registration_channels
    WHERE guild_id = ?
  `);

  const result = stmt.get(guildId) as { channel_id: string } | undefined;
  return result?.channel_id || null;
}

/**
 * Delete registration channel setting
 * Returns true if deleted
 */
export function deleteRegistrationChannel(guildId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM registration_channels
    WHERE guild_id = ?
  `);

  const result = stmt.run(guildId);
  return result.changes > 0;
}

// ============================================================================
// Verification Settings Operations
// ============================================================================

/**
 * Set verification settings for a guild (UPSERT)
 * Returns true if successful
 */
export function setVerificationSettings(
  guildId: string,
  reviewChannelId: string,
  pendingRoleId: string | null,
  approvedRoleId: string | null,
  approvedChannelId: string | null = null
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO verification_settings
      (guild_id, review_channel_id, pending_role_id, approved_role_id, approved_channel_id, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET
      review_channel_id = excluded.review_channel_id,
      pending_role_id = excluded.pending_role_id,
      approved_role_id = excluded.approved_role_id,
      approved_channel_id = excluded.approved_channel_id,
      enabled = 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(guildId, reviewChannelId, pendingRoleId, approvedRoleId, approvedChannelId);
  return result.changes > 0;
}

/**
 * Get verification settings for a guild
 * Returns null if not configured
 */
export function getVerificationSettings(
  guildId: string
): import('../types/index.js').VerificationSettingsRow | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM verification_settings
    WHERE guild_id = ?
  `);

  return (
    (stmt.get(guildId) as
      | import('../types/index.js').VerificationSettingsRow
      | undefined) || null
  );
}

/**
 * Disable verification for a guild
 * Returns true if successful
 */
export function disableVerificationSettings(guildId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE verification_settings
    SET enabled = 0, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

  const result = stmt.run(guildId);
  return result.changes > 0;
}

// ============================================================================
// Pending Registration Operations
// ============================================================================

/**
 * Create a pending registration entry
 * Returns true if successful, false if duplicate
 */
export function createPendingRegistration(
  guildId: string,
  userId: string,
  reviewMessageId: string,
  registrationId: number
): boolean {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      INSERT INTO pending_registrations
        (guild_id, user_id, review_message_id, registration_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    stmt.run(guildId, userId, reviewMessageId, registrationId);
    return true;
  } catch (error: any) {
    // UNIQUE constraint violation (user already has pending registration)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return false;
    }
    throw error;
  }
}

/**
 * Get pending registration by guild and user
 * Returns null if not found
 */
export function getPendingRegistration(
  guildId: string,
  userId: string
): import('../types/index.js').PendingRegistrationRow | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM pending_registrations
    WHERE guild_id = ? AND user_id = ?
  `);

  return (
    (stmt.get(guildId, userId) as
      | import('../types/index.js').PendingRegistrationRow
      | undefined) || null
  );
}

/**
 * Update pending registration status
 * Returns true if successful
 */
export function updatePendingRegistrationStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected',
  approvedBy: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE pending_registrations
    SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = stmt.run(status, approvedBy, id);
  return result.changes > 0;
}

/**
 * Get player registration by ID
 * Returns null if not found
 */
export function getPlayerRegistrationById(
  id: number
): import('../types/index.js').PlayerRegistrationRow | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM player_registrations
    WHERE id = ?
  `);

  return (
    (stmt.get(id) as
      | import('../types/index.js').PlayerRegistrationRow
      | undefined) || null
  );
}

/**
 * Update player registration approval status
 * Returns true if successful
 */
export function updatePlayerRegistrationApproval(
  id: number,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  approvedBy: string
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE player_registrations
    SET approval_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = stmt.run(approvalStatus, approvedBy, id);
  return result.changes > 0;
}

// ============================================================================
// Panel Operations
// ============================================================================

export interface PanelRow {
  message_id: string;
  guild_id: string;
  channel_id: string;
  queue_type: 'sword_trial' | 'hero_realm';
  created_at: string;
}

/**
 * Create a new panel
 */
export function createPanel(
  messageId: string,
  guildId: string,
  channelId: string,
  queueType: 'sword_trial' | 'hero_realm'
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO panels (message_id, guild_id, channel_id, queue_type)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(messageId, guildId, channelId, queueType);
}

/**
 * Get panel by message ID
 */
export function getPanel(messageId: string): PanelRow | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM panels WHERE message_id = ?');
  return (stmt.get(messageId) as PanelRow) || null;
}

/**
 * Get panel by guild ID and queue type
 */
export function getPanelByType(
  guildId: string,
  queueType: 'sword_trial' | 'hero_realm'
): PanelRow | null {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM panels WHERE guild_id = ? AND queue_type = ?'
  );
  return (stmt.get(guildId, queueType) as PanelRow) || null;
}

/**
 * Delete a panel
 */
export function deletePanel(messageId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM panels WHERE message_id = ?');
  stmt.run(messageId);
}

/**
 * Get all panels across all guilds
 */
export function getAllPanels(): PanelRow[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM panels');
  return stmt.all() as PanelRow[];
}

/**
 * Get all panels for a specific guild
 */
export function getGuildPanels(guildId: string): PanelRow[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM panels WHERE guild_id = ?');
  return stmt.all(guildId) as PanelRow[];
}
