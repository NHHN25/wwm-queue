-- Where Winds Meet Queue Bot Database Schema
-- SQLite database for storing queue state and player entries

-- Queues table
-- Stores metadata for each queue (linked to Discord message)
CREATE TABLE IF NOT EXISTS queues (
  message_id TEXT PRIMARY KEY,      -- Discord message ID (unique identifier)
  guild_id TEXT NOT NULL,            -- Discord guild (server) ID
  channel_id TEXT NOT NULL,          -- Discord channel ID where queue is posted
  queue_type TEXT NOT NULL           -- Type of queue: 'sword_trial' or 'hero_realm'
    CHECK(queue_type IN ('sword_trial', 'hero_realm')),
  capacity INTEGER NOT NULL,         -- Maximum number of players (5 or 10)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue players table
-- Stores individual player entries in queues
CREATE TABLE IF NOT EXISTS queue_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,          -- Foreign key to queues.message_id
  user_id TEXT NOT NULL,             -- Discord user ID
  username TEXT NOT NULL,            -- Display name (cached for performance)
  role TEXT NOT NULL                 -- Player role: 'tank', 'healer', or 'dps'
    CHECK(role IN ('tank', 'healer', 'dps')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint with cascade delete
  -- If queue is deleted, all player entries are automatically removed
  FOREIGN KEY (message_id) REFERENCES queues(message_id)
    ON DELETE CASCADE,

  -- Prevent duplicate entries: one user can only join a queue once
  UNIQUE(message_id, user_id)
);

-- Indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_queue_players_message
  ON queue_players(message_id);

CREATE INDEX IF NOT EXISTS idx_queue_players_user
  ON queue_players(user_id);

CREATE INDEX IF NOT EXISTS idx_queues_guild
  ON queues(guild_id);

CREATE INDEX IF NOT EXISTS idx_queues_type
  ON queues(guild_id, queue_type);

-- Guild settings table
-- Stores per-guild configuration like language preference
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,         -- Discord guild (server) ID
  language TEXT NOT NULL DEFAULT 'en' -- Preferred language: 'en' or 'vi'
    CHECK(language IN ('en', 'vi')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player registration data
-- Stores in-game information for each user per guild
CREATE TABLE IF NOT EXISTS player_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,              -- Discord guild ID
  user_id TEXT NOT NULL,               -- Discord user ID
  ingame_name TEXT NOT NULL,           -- Player's in-game name
  ingame_uid TEXT NOT NULL,            -- Player's unique game ID
  gear_score INTEGER NOT NULL,         -- Combat power / "lực chiến"
  primary_weapon TEXT NOT NULL,        -- Primary weapon name (e.g., 'strategic_sword', 'nameless_spear')
  secondary_weapon TEXT NOT NULL,      -- Secondary weapon name
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- One registration per user per guild
  UNIQUE(guild_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_registrations_guild
  ON player_registrations(guild_id);

CREATE INDEX IF NOT EXISTS idx_player_registrations_user
  ON player_registrations(guild_id, user_id);

-- Registration channel settings per guild
-- Only one registration channel per guild
CREATE TABLE IF NOT EXISTS registration_channels (
  guild_id TEXT PRIMARY KEY,           -- Discord guild ID
  channel_id TEXT NOT NULL,            -- Discord channel ID where registration is allowed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
