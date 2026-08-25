-- Where Winds Meet Queue Bot Database Schema
-- SQLite database for storing queue state and player entries

-- Queues table
-- Stores metadata for each queue (linked to Discord message)
CREATE TABLE IF NOT EXISTS queues (
  message_id TEXT PRIMARY KEY,      -- Discord message ID (unique identifier)
  guild_id TEXT NOT NULL,            -- Discord guild (server) ID
  channel_id TEXT NOT NULL,          -- Discord channel ID where queue is posted
  queue_type TEXT NOT NULL           -- Type of queue: 'sword_trial', 'hero_realm', or 'guild_war'
    CHECK(queue_type IN ('sword_trial', 'hero_realm', 'guild_war')),
  capacity INTEGER NOT NULL,         -- Maximum number of players (5 or 10)
  status TEXT NOT NULL DEFAULT 'open' -- Queue status: 'open' or 'closed'
    CHECK(status IN ('open', 'closed')),
  expires_at DATETIME,               -- When the queue timer expires (null = no timer)
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
  team TEXT                          -- Guild War team
    CHECK(team IN ('jungler', 'offense', 'defense') OR team IS NULL),
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
  arena_rank TEXT DEFAULT '',          -- Arena/PvP rank (free text: "Gold III", "Diamond", etc.)
  primary_weapon TEXT NOT NULL,        -- Primary weapon name (e.g., 'strategic_sword', 'nameless_spear')
  secondary_weapon TEXT NOT NULL,      -- Secondary weapon name
  approval_status TEXT DEFAULT 'pending' -- Approval status: 'pending', 'approved', 'rejected'
    CHECK(approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,                    -- Discord user ID of approver
  approved_at DATETIME,                -- Timestamp of approval
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

CREATE INDEX IF NOT EXISTS idx_player_registrations_approval
  ON player_registrations(guild_id, approval_status);

-- Registration channel settings per guild
-- Only one registration channel per guild
CREATE TABLE IF NOT EXISTS registration_channels (
  guild_id TEXT PRIMARY KEY,           -- Discord guild ID
  channel_id TEXT NOT NULL,            -- Discord channel ID where registration is allowed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Verification settings per guild
-- Stores configuration for member approval system
CREATE TABLE IF NOT EXISTS verification_settings (
  guild_id TEXT PRIMARY KEY,           -- Discord guild ID
  pending_role_id TEXT,                -- Role auto-assigned to new members (to be removed after approval)
  approved_role_id TEXT,               -- Role assigned after approval
  review_channel_id TEXT NOT NULL,     -- Channel where pending registrations are posted for review
  approved_channel_id TEXT,            -- Channel where approval notifications are sent (optional, defaults to review channel)
  enabled BOOLEAN DEFAULT 1,           -- Feature toggle (1 = enabled, 0 = disabled)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_settings_guild
  ON verification_settings(guild_id);

-- Pending registrations awaiting admin approval
-- Tracks registration review messages and their status
CREATE TABLE IF NOT EXISTS pending_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,              -- Discord guild ID
  user_id TEXT NOT NULL,               -- Discord user ID
  review_message_id TEXT NOT NULL,     -- Message ID in review channel
  registration_id INTEGER NOT NULL,    -- Foreign key to player_registrations.id
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
    CHECK(status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,                    -- Discord user ID of approver
  approved_at DATETIME,                -- Timestamp of approval/rejection
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint with cascade delete
  FOREIGN KEY (registration_id) REFERENCES player_registrations(id)
    ON DELETE CASCADE,

  -- One pending registration per user per guild
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_guild
  ON pending_registrations(guild_id);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_user
  ON pending_registrations(guild_id, user_id);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_message
  ON pending_registrations(review_message_id);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_status
  ON pending_registrations(guild_id, status);

-- Panels table
-- Stores metadata for each panel embed (admin-posted, permanent)
-- Panels are persistent "Create Queue" buttons that anyone can click
CREATE TABLE IF NOT EXISTS panels (
  message_id TEXT PRIMARY KEY,       -- Discord message ID (unique identifier)
  guild_id TEXT NOT NULL,            -- Discord guild (server) ID
  channel_id TEXT NOT NULL,          -- Discord channel ID where panel is posted
  queue_type TEXT NOT NULL           -- Type of queue this panel creates
    CHECK(queue_type IN ('sword_trial', 'hero_realm', 'guild_war')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_panels_guild
  ON panels(guild_id);

CREATE INDEX IF NOT EXISTS idx_panels_guild_type
  ON panels(guild_id, queue_type);

-- ============================================================================
-- Guild War (Bang Chien) scheduled events
-- ============================================================================

-- Per-guild Guild War configuration
-- Event times, notification lead times, channels, and custom team names
CREATE TABLE IF NOT EXISTS guild_war_settings (
  guild_id TEXT PRIMARY KEY,             -- Discord guild ID
  registration_channel_id TEXT,          -- Channel where registration embeds are posted
  announce_channel_id TEXT,              -- Channel where reminder pings are sent
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', -- IANA timezone for all local times below
  sat_time TEXT NOT NULL DEFAULT '20:00', -- Saturday event start (local, HH:MM)
  sun_time TEXT NOT NULL DEFAULT '20:00', -- Sunday event start (local, HH:MM)
  open_weekday INTEGER NOT NULL DEFAULT 4, -- ISO weekday to auto-open registration (4 = Thursday)
  open_time TEXT NOT NULL DEFAULT '12:00', -- Time of day to auto-open (local, HH:MM)
  auto_open INTEGER NOT NULL DEFAULT 1,  -- 1 = post registration automatically each week
  notify_lead_min INTEGER NOT NULL DEFAULT 60, -- Main ping, minutes before event_at
  nudge_lead_min INTEGER NOT NULL DEFAULT 15,  -- Follow-up nudge to unconfirmed players
  capacity INTEGER NOT NULL DEFAULT 30,  -- Max signups per event (shared across both teams)
  team_offense_name TEXT,                -- Custom label for the offense team (null = localized default)
  team_defense_name TEXT,                -- Custom label for the defense team (null = localized default)
  last_auto_open_at DATETIME,            -- Guard against double-posting on restart
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One row per Guild War occurrence (Saturday and Sunday are separate events)
CREATE TABLE IF NOT EXISTS guild_war_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,                -- Discord guild ID
  channel_id TEXT NOT NULL,              -- Channel holding the registration embed
  message_id TEXT,                       -- Registration embed message ID (null until posted)
  day TEXT NOT NULL                      -- Which weekend day this event is
    CHECK(day IN ('sat', 'sun')),
  event_at DATETIME NOT NULL,            -- UTC instant the war starts
  notify_at DATETIME NOT NULL,           -- UTC instant to send the main ping
  nudge_at DATETIME NOT NULL,            -- UTC instant to nudge unconfirmed players
  notified_at DATETIME,                  -- Set once the main ping is sent (idempotency guard)
  nudged_at DATETIME,                    -- Set once the nudge is sent (idempotency guard)
  capacity INTEGER NOT NULL DEFAULT 30,  -- Snapshot of settings.capacity at creation time
  status TEXT NOT NULL DEFAULT 'open'    -- Lifecycle: accepting signups -> locked -> done
    CHECK(status IN ('open', 'locked', 'done', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- One event per guild per start time
  UNIQUE(guild_id, event_at)
);

CREATE INDEX IF NOT EXISTS idx_gw_events_guild
  ON guild_war_events(guild_id);

CREATE INDEX IF NOT EXISTS idx_gw_events_message
  ON guild_war_events(message_id);

-- Scheduler hot path: find events whose ping is due
CREATE INDEX IF NOT EXISTS idx_gw_events_due
  ON guild_war_events(status, notify_at);

-- Player signups for a Guild War event
CREATE TABLE IF NOT EXISTS guild_war_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,             -- Foreign key to guild_war_events.id
  user_id TEXT NOT NULL,                 -- Discord user ID
  username TEXT NOT NULL,                -- Display name (cached for performance)
  team TEXT NOT NULL                     -- Offense or defense (no jungler for scheduled wars)
    CHECK(team IN ('offense', 'defense')),
  role TEXT NOT NULL                     -- Player role
    CHECK(role IN ('tank', 'healer', 'dps')),
  attendance TEXT NOT NULL DEFAULT 'unknown' -- Response to the reminder ping
    CHECK(attendance IN ('unknown', 'confirmed', 'declined')),
  assigned_by TEXT,                      -- Admin who moved this player (null = player's own choice)
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id) REFERENCES guild_war_events(id)
    ON DELETE CASCADE,

  -- One signup per player per event
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gw_signups_event
  ON guild_war_signups(event_id);

CREATE INDEX IF NOT EXISTS idx_gw_signups_user
  ON guild_war_signups(user_id);

CREATE INDEX IF NOT EXISTS idx_gw_signups_team
  ON guild_war_signups(event_id, team);
