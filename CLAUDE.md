# Where Winds Meet Queue Bot - Developer Documentation

## Project Overview

A Discord bot for organizing multiplayer co-op content in the game "Where Winds Meet". The bot manages queue systems for Sword Trial (5 players) and Hero Realm (10 players) activities using interactive embeds with role-based buttons.

## Architecture

### Tech Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+ (strict mode)
- **Discord Library**: discord.js 14.x
- **Database**: SQLite via better-sqlite3 (synchronous operations)
- **Deployment**: Railway/Render/Fly.io (free tier compatible)

### Project Structure

```
wwm-queue/
├── src/
│   ├── index.ts                    # Main bot entry point, event routing
│   ├── commands/
│   │   └── setup.ts                # Slash commands (/setup, /reset, /close, /language)
│   ├── components/
│   │   └── queueButtons.ts         # Button interaction handlers
│   ├── database/
│   │   ├── database.ts             # SQLite operations (CRUD)
│   │   └── schema.sql              # Database schema
│   ├── localization/
│   │   ├── index.ts                # Language management functions
│   │   ├── types.ts                # Translation type definitions
│   │   ├── en.ts                   # English translations
│   │   └── vi.ts                   # Vietnamese translations
│   ├── models/
│   │   ├── Queue.ts                # Queue business logic
│   │   └── QueuePlayer.ts          # Player utilities
│   ├── utils/
│   │   ├── embeds.ts               # Embed builders
│   │   └── constants.ts            # Queue configs, emojis
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── dist/                           # Compiled JS (gitignored)
├── data/
│   └── queues.db                   # SQLite database
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Template
├── package.json
├── tsconfig.json
├── README.md                       # User documentation
└── CLAUDE.md                       # This file
```

## Core Features

### 1. Queue System
- **Two Queue Types**: Sword Trial (5 capacity), Hero Realm (10 capacity)
- **Flexible Roles**: Tank, Healer, DPS (no composition enforcement)
- **Single Queue Rule**: Players can only join one queue at a time
- **Real-time Updates**: Embeds update immediately on join/leave

### 2. Per-User Button States ⚠️ KEY CHALLENGE
Discord doesn't natively support different button states per user on the same message.

**Solution: The Two-Update Pattern**

```typescript
// User clicks "Tank" button
async function handleJoinButton(interaction, role) {
  // 1. Add to database
  const queue = Queue.load(interaction.message.id);
  queue.addPlayer(userId, username, role);

  // 2. UPDATE #1: User-specific (show Leave button to this user)
  await interaction.update({
    components: [createLeaveButton()]
  });

  // 3. UPDATE #2: Global (update embed for all users)
  await interaction.message.edit({
    embeds: [createQueueEmbed(queue.getState())],
    components: [createJoinButtons()] // Default view
  });
}
```

**How it works**:
- `interaction.update()` updates the button view for the user who clicked
- `message.edit()` updates the embed for all viewers
- If user refreshes, they see default buttons but next click corrects state
- Provides good-enough UX without complex per-user message tracking

### 3. State Persistence
- **Database**: SQLite stores queue metadata and player entries
- **Message ID as Primary Key**: Links database records to Discord messages
- **State Restoration**: On bot restart, fetch all queues from DB and verify messages exist
- **Orphan Cleanup**: Delete database entries for missing messages/channels

### 4. Admin Commands
- **`/setup [sword-trial|hero-realm] [channel]`**: Create persistent queue embed
- **`/reset [queue-type]`**: Clear all players (keep embed)
- **`/close [queue-type]`**: Delete embed and database entry
- **`/language [language]`**: Change bot language for the server (English/Vietnamese)
- **Permissions**: Administrator role required

## Database Schema

### Tables

**queues**
```sql
CREATE TABLE queues (
  message_id TEXT PRIMARY KEY,      -- Discord message ID
  guild_id TEXT NOT NULL,            -- Discord guild (server) ID
  channel_id TEXT NOT NULL,          -- Discord channel ID
  queue_type TEXT NOT NULL           -- 'sword_trial' or 'hero_realm'
    CHECK(queue_type IN ('sword_trial', 'hero_realm')),
  capacity INTEGER NOT NULL,         -- 5 or 10
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**queue_players**
```sql
CREATE TABLE queue_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,          -- FK to queues.message_id
  user_id TEXT NOT NULL,             -- Discord user ID
  username TEXT NOT NULL,            -- Display name (cached)
  role TEXT NOT NULL                 -- 'tank', 'healer', or 'dps'
    CHECK(role IN ('tank', 'healer', 'dps')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES queues(message_id)
    ON DELETE CASCADE,
  UNIQUE(message_id, user_id)        -- Prevent duplicate entries
);

CREATE INDEX idx_queue_players_message ON queue_players(message_id);
CREATE INDEX idx_queue_players_user ON queue_players(user_id);
```

**guild_settings**
```sql
CREATE TABLE guild_settings (
  guild_id TEXT PRIMARY KEY,         -- Discord guild (server) ID
  language TEXT NOT NULL DEFAULT 'en' -- Preferred language: 'en' or 'vi'
    CHECK(language IN ('en', 'vi')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Why Synchronous SQLite?
- **Race Condition Prevention**: Node.js is single-threaded, synchronous operations complete atomically
- **No Async Complexity**: No need for locks, semaphores, or transaction queues
- **UNIQUE Constraints**: Database enforces duplicate prevention
- **Performance**: SQLite is fast enough for small-scale bot operations

## Key Data Flow

### Join Queue Flow
```
1. User clicks "Tank" button
2. Button handler validates:
   - Queue exists?
   - Queue not full?
   - User not in another queue?
3. Database: INSERT INTO queue_players
4. UPDATE #1: Show Leave button to user (interaction.update)
5. UPDATE #2: Refresh embed for all viewers (message.edit)
6. If queue full: Send followUp message pinging all players
```

### Leave Queue Flow
```
1. User clicks "Leave Queue" button
2. Button handler validates:
   - Queue exists?
   - User is in this queue?
3. Database: DELETE FROM queue_players WHERE user_id=...
4. UPDATE #1: Show role buttons to user (interaction.update)
5. UPDATE #2: Refresh embed for all viewers (message.edit)
```

### State Restoration Flow (Bot Restart)
```
1. Bot ready event triggers
2. Database: SELECT * FROM queues
3. For each queue:
   a. Fetch Discord channel
   b. Fetch Discord message
   c. If exists: Update embed to match DB state
   d. If missing: DELETE FROM queues (cleanup)
4. Log restoration results
```

## TypeScript Types

### Core Types
```typescript
// Queue types
export type QueueType = 'sword_trial' | 'hero_realm';
export type PlayerRole = 'tank' | 'healer' | 'dps';

// Queue configuration
export interface QueueConfig {
  type: QueueType;
  capacity: number;
  displayName: string;  // "Sword Trial" or "Hero Realm"
  color: number;        // Embed color
}

// Database row representations
export interface QueueData {
  messageId: string;
  guildId: string;
  channelId: string;
  queueType: QueueType;
  capacity: number;
  createdAt: Date;
}

export interface QueuePlayerData {
  userId: string;
  username: string;
  role: PlayerRole;
  joinedAt: Date;
}

// Combined state for embed generation
export interface QueueState {
  queue: QueueData;
  players: QueuePlayerData[];  // Ordered by joinedAt
}
```

## Critical Implementation Details

### 1. Queue Model Class
**File**: [src/models/Queue.ts](src/models/Queue.ts)

**Purpose**: Encapsulate queue business logic, bridge database and Discord layers

**Key Methods**:
```typescript
class Queue {
  static create(messageId, guildId, channelId, queueType): Queue
  static load(messageId): Queue | null
  static loadAll(guildId): Queue[]

  addPlayer(userId, username, role): boolean
  removePlayer(userId): boolean
  isFull(): boolean
  hasPlayer(userId): boolean
  clear(): void
  delete(): void
  getState(): QueueState
}
```

**Design Principle**: Each method performs database operation AND returns updated state

### 2. Embed Generation
**File**: [src/utils/embeds.ts](src/utils/embeds.ts)

**Function**: `createQueueEmbed(state: QueueState): EmbedBuilder`

**Embed Format**:
```
┌───────────────────────────────────┐
│ 🗡️ Sword Trial Queue              │
│ [Server Name]                      │
├───────────────────────────────────┤
│ Players: 3/5                       │
│                                    │
│ 1. 🛡️ Tank - @Player1             │
│ 2. 💚 Healer - @Player2            │
│ 3. ⚔️ DPS - @Player3               │
│ 4. ⬜ Empty                        │
│ 5. ⬜ Empty                        │
├───────────────────────────────────┤
│ Click a role button to join!       │
└───────────────────────────────────┘
```

**Edge Cases**:
- Empty queue: Show "No players in queue"
- Queue full: Add "✅ Queue is full!"
- Player mentions: Use `<@userId>` format

### 3. Button Components
**File**: [src/components/queueButtons.ts](src/components/queueButtons.ts)

**Button Custom IDs**:
```typescript
// Join buttons
`queue_join_tank`
`queue_join_healer`
`queue_join_dps`

// Leave button
`queue_leave`
```

**Button Builders**:
```typescript
export function createJoinButtons(): ActionRowBuilder<ButtonBuilder>
export function createLeaveButton(): ActionRowBuilder<ButtonBuilder>
```

**Interaction Handler**:
```typescript
export async function handleButtonInteraction(
  interaction: ButtonInteraction
): Promise<void>
```

**Validation Checks**:
- Queue exists? (Queue.load returns non-null)
- Queue full? (queue.isFull())
- User in another queue? (check all queues in guild)
- User already in this queue? (database UNIQUE constraint)

### 4. Slash Commands
**File**: [src/commands/setup.ts](src/commands/setup.ts)

**Command Definitions**:
```typescript
// /setup
new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Create a queue')
  .addSubcommand(sub => sub
    .setName('sword-trial')
    .setDescription('Create Sword Trial queue (5 players)')
    .addChannelOption(opt => opt
      .setName('channel')
      .setDescription('Channel for queue (default: current)')
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('hero-realm')
    .setDescription('Create Hero Realm queue (10 players)')
    .addChannelOption(opt => opt
      .setName('channel')
      .setDescription('Channel for queue (default: current)')
      .setRequired(false)))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// /reset
new SlashCommandBuilder()
  .setName('reset')
  .setDescription('Clear all players from a queue')
  .addStringOption(opt => opt
    .setName('queue-type')
    .setDescription('Queue to reset')
    .setRequired(true)
    .addChoices(
      { name: 'Sword Trial', value: 'sword_trial' },
      { name: 'Hero Realm', value: 'hero_realm' }
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// /close
new SlashCommandBuilder()
  .setName('close')
  .setDescription('Delete a queue completely')
  .addStringOption(opt => opt
    .setName('queue-type')
    .setDescription('Queue to close')
    .setRequired(true)
    .addChoices(
      { name: 'Sword Trial', value: 'sword_trial' },
      { name: 'Hero Realm', value: 'hero_realm' }
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// /language
new SlashCommandBuilder()
  .setName('language')
  .setDescription('Change the bot language')
  .addStringOption(opt => opt
    .setName('language')
    .setDescription('Select a language')
    .setRequired(true)
    .addChoices(
      { name: 'English', value: 'en' },
      { name: 'Tiếng Việt', value: 'vi' }
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
```

**Permission Verification** (before creating queue):
```typescript
const requiredPermissions = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages  // Optional but recommended
];

const botMember = await guild.members.fetchMe();
const permissions = channel.permissionsFor(botMember);
const missing = requiredPermissions.filter(p => !permissions.has(p));

if (missing.length > 0) {
  return interaction.reply({
    content: '❌ I need these permissions: ' + missing.join(', '),
    ephemeral: true
  });
}
```

### 5. Main Bot Entry Point
**File**: [src/index.ts](src/index.ts)

**Client Configuration**:
```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});
```

**Event Handlers**:
- `ClientReady`: Register commands, restore queue state
- `InteractionCreate`: Route button interactions and slash commands

**State Restoration**:
```typescript
async function restoreQueues(client: Client): Promise<void> {
  const allQueues = db.getAllQueues();
  let restored = 0;
  let cleaned = 0;

  for (const queueData of allQueues) {
    try {
      const channel = await client.channels.fetch(queueData.channelId);
      if (!channel?.isTextBased()) {
        db.deleteQueue(queueData.messageId);
        cleaned++;
        continue;
      }

      const message = await channel.messages.fetch(queueData.messageId);
      const queue = Queue.load(queueData.messageId);
      const state = queue.getState();

      await message.edit({
        embeds: [createQueueEmbed(state)],
        components: [createJoinButtons()]
      });

      restored++;
    } catch (error) {
      console.error(`Failed to restore queue ${queueData.messageId}:`, error);
      db.deleteQueue(queueData.messageId);
      cleaned++;
    }
  }

  console.log(`✅ Restored ${restored} queues, cleaned ${cleaned} orphans`);
}
```

**Graceful Shutdown**:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  client.destroy();
  db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  client.destroy();
  db.close();
  process.exit(0);
});
```

## Error Handling

### Error Categories

**1. User Errors** (Ephemeral messages)
- User already in another queue
- Queue is full
- User not in queue (clicking Leave)
- Queue doesn't exist

**2. Permission Errors** (Ephemeral messages)
- Bot missing required permissions
- User not administrator (for slash commands)

**3. System Errors** (Logged, generic message to user)
- Database errors
- Discord API errors
- Message/channel deleted

### Error Response Pattern
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error context:', error);

  const reply = {
    content: '❌ An error occurred. Please try again or contact an admin.',
    ephemeral: true
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(reply);
  } else {
    await interaction.reply(reply);
  }
}
```

## Testing Strategy

### Manual Testing Checklist

**Basic Functionality**:
1. `/setup sword-trial` creates embed with buttons
2. Click Tank → User added, embed updates, Leave button shown
3. Click Leave → User removed, embed updates, role buttons shown
4. Different users can join different roles
5. Queue full (5/5) → 6th user gets error, all 5 pinged

**Multi-Queue**:
1. Create both Sword Trial and Hero Realm queues
2. Join Sword Trial as User A
3. Try to join Hero Realm as User A → Error message

**Persistence**:
1. Create queue with 3 players
2. Restart bot (Ctrl+C, restart)
3. Verify queue still shows 3 players
4. Verify buttons still work

**Admin Commands**:
1. `/reset sword-trial` → Queue cleared, embed shows 0/5
2. `/close sword-trial` → Message deleted, database cleaned
3. Non-admin tries `/setup` → Permission denied

**Edge Cases**:
1. Delete queue message manually → Restart bot → Database cleaned
2. Delete channel → Restart bot → Database cleaned
3. Bot missing permissions → `/setup` shows clear error message
4. 3 users click simultaneously → All added successfully

### Concurrent Testing
Test with 3+ users clicking buttons at the same time:
- SQLite UNIQUE constraint prevents duplicates
- Synchronous operations prevent race conditions
- Expected: All valid joins succeed, duplicates rejected with error

## Deployment

### Environment Variables
```bash
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DATABASE_PATH=./data/queues.db
NODE_ENV=production
```

### Railway Deployment

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Setup Steps**:
1. Create Railway project
2. Connect GitHub repository
3. Add environment variables in dashboard
4. Add persistent volume mounted to `/app/data`
5. Deploy automatically on push

### Render Deployment

**render.yaml**:
```yaml
services:
  - type: worker
    name: wwm-queue-bot
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DISCORD_TOKEN
        sync: false
      - key: DISCORD_CLIENT_ID
        sync: false
      - key: NODE_ENV
        value: production
```

### Fly.io Deployment

**fly.toml**:
```toml
app = "wwm-queue-bot"
primary_region = "sjc"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"
```

## Maintenance

### Common Tasks

**Add New Queue Type**:
1. Update `QueueType` in [src/types/index.ts](src/types/index.ts)
2. Add config in [src/utils/constants.ts](src/utils/constants.ts)
3. Update database CHECK constraint in schema.sql
4. Add choice to `/setup` command
5. Run database migration if needed

**Change Queue Capacity**:
1. Update `QUEUE_CONFIGS` in [src/utils/constants.ts](src/utils/constants.ts)
2. Existing queues keep old capacity (stored in DB)
3. New queues use updated capacity

**Update Embed Format**:
1. Modify `createQueueEmbed()` in [src/utils/embeds.ts](src/utils/embeds.ts)
2. Restart bot to restore all queues with new format

**Database Backup**:
```bash
# Copy database file
cp data/queues.db data/queues_backup_$(date +%Y%m%d).db

# SQLite dump
sqlite3 data/queues.db .dump > backup.sql
```

### Logging

**Structured Log Format**:
```typescript
console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error);
```

**What to Log**:
- Bot startup/shutdown
- Queue creation/deletion
- Player joins/leaves (in development only)
- State restoration results
- All errors with stack traces

**What NOT to Log in Production**:
- User IDs (GDPR compliance)
- Message content
- Sensitive environment variables

## Troubleshooting

### Bot Not Responding to Buttons
- Check bot is online and connected
- Verify interaction token not expired (15min limit)
- Check console for errors
- Verify bot has `ReadMessageHistory` permission

### Database Locked Error
- Ensure only one bot instance running
- Enable WAL mode: `PRAGMA journal_mode=WAL`
- Check file permissions on `data/queues.db`

### Queue State Lost After Restart
- Check `DATABASE_PATH` environment variable
- Verify database file exists and is readable
- Check state restoration logs
- Ensure no errors in `restoreQueues()` function

### Buttons Show Wrong State
- Expected behavior due to two-update pattern
- User sees default buttons after refresh
- Clicking any button corrects the state
- Not a bug, just UX limitation

### Permission Denied Errors
- Bot needs: Send Messages, Embed Links, Read Message History
- Optional: Manage Messages, Mention Everyone
- Re-invite bot with updated permissions
- Use OAuth2 URL generator with correct scopes

## Architecture Decisions

### Why better-sqlite3 over async alternatives?
- **Synchronous = Atomic**: No race conditions from concurrent interactions
- **Simpler code**: No async/await in database layer
- **Good performance**: SQLite is fast enough for bot workload
- **Single-threaded Node.js**: Perfect match for synchronous operations

### Why message ID as primary key?
- **Natural key**: Discord message ID uniquely identifies queue
- **Easy lookups**: Button interactions provide message ID
- **Cascade delete**: If message deleted, queue data should be too
- **No need for UUIDs**: Message ID serves the same purpose

### Why store username in database?
- **Performance**: Avoid fetching user for every embed update
- **Reliability**: Works even if user leaves server
- **Trade-off**: May become stale if user changes name (acceptable)

### Why no role enforcement?
- **Game flexibility**: Any composition can attempt content
- **Simpler logic**: No validation rules to maintain
- **User freedom**: Let players decide their team composition

### Why single queue participation?
- **Prevent confusion**: Players shouldn't be in multiple queues
- **Clearer intent**: Commit to one activity at a time
- **Simpler UI**: Clear button states

## Future Enhancements (Post-MVP)

**Nice-to-Have Features**:
1. Queue history/statistics per user
2. AFK check before full queue notification
3. Queue cooldown (prevent spam join/leave)
4. Role balance suggestions ("Need 1 Healer")
5. Multiple queues per type (Morning/Evening)
6. Queue templates (custom capacities)
7. Scheduled queues (start time)
8. Queue priority for VIP members
9. DM notifications option
10. Queue expiration (auto-clear after X hours)

**Extension Points**:
- Custom queue types via configuration
- Webhook integration for external tools
- Statistics dashboard (web interface)

### 5. Localization System
**Directory**: [src/localization/](src/localization/)

**Supported Languages**:
- English (`en`) - Default
- Vietnamese (`vi`)

**Language Management**:
```typescript
// Get guild's language preference (defaults to 'en')
getGuildLanguage(guildId: string): Language

// Set guild's language preference
setGuildLanguage(guildId: string, language: Language): boolean

// Get translations for a guild
getGuildTranslations(guildId: string): Translations

// Validate language code
isValidLanguage(language: string): boolean

// Get display name for language
getLanguageDisplayName(language: Language): string
```

**Translation Structure**:
```typescript
interface Translations {
  commands: {
    setup: { description: string; ... };
    reset: { description: string; ... };
    // ... other commands
  };
  errors: {
    generic: string;
    queueFull: string;
    // ... other errors
  };
  // ... other translation keys
}
```

**Database Storage**:
- Language preferences stored in `guild_settings` table
- Per-guild configuration (each server can choose their language)
- Changes persist across bot restarts

## Resources

### Discord.js Documentation
- [Guide](https://discordjs.guide/)
- [API Documentation](https://discord.js.org/)
- [Button Interactions](https://discordjs.guide/message-components/buttons.html)
- [Slash Commands](https://discordjs.guide/interactions/slash-commands.html)

### better-sqlite3 Documentation
- [GitHub](https://github.com/WiseLibs/better-sqlite3)
- [API Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

### TypeScript
- [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [tsconfig Reference](https://www.typescriptlang.org/tsconfig)

## Support

For issues, questions, or contributions, please refer to the project repository.

---

**Last Updated**: 2025-12-15
**Version**: 1.1.0
**Status**: In Development

**Recent Changes**:
- ✅ **Full localization system implemented**
  - `/language` command changes server language instantly
  - All queue embeds update in real-time when language changes
  - Leave button label localized (Tank/Healer/DPS stay in English)
  - English and Vietnamese translations complete
  - Guild settings system for language preferences
  - Translations persist across bot restarts
