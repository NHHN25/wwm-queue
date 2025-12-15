# Where Winds Meet Queue Bot

A Discord bot for organizing multiplayer co-op content in the game **Where Winds Meet**. Manage queue systems for Sword Trial (5 players) and Hero Realm (10 players) activities using interactive embeds with role-based buttons.

## Features

- **Two Queue Types**: Sword Trial (5 players) and Hero Realm (10 players)
- **Flexible Roles**: Players choose Tank, Healer, or DPS when joining
- **No Role Enforcement**: Any team composition is valid
- **Single Queue Rule**: Players can only be in one queue at a time
- **Real-time Updates**: Queue embeds update instantly when players join or leave
- **Persistent State**: Queue data survives bot restarts
- **Admin Commands**: Easy setup and management via slash commands

## Quick Start

### Prerequisites

- Node.js 18 or higher
- A Discord bot token ([How to create a Discord bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html))
- Administrator permissions on your Discord server

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wwm-queue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Discord bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

### Invite the Bot to Your Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **OAuth2 > URL Generator**
4. Select scopes: `bot`, `applications.commands`
5. Select permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Manage Messages (optional but recommended)
   - Mention Everyone (optional, for queue notifications)
6. Copy the generated URL and open it in your browser
7. Select your server and authorize the bot

## Usage

### Admin Commands

#### Create a Queue
```
/setup sword-trial [channel]
/setup hero-realm [channel]
```
Creates a persistent queue embed in the specified channel (defaults to current channel).

**Example:**
```
/setup sword-trial #queue-channel
```

#### Reset a Queue
```
/reset [queue-type]
```
Clears all players from the queue while keeping the embed.

**Example:**
```
/reset sword-trial
```

#### Close a Queue
```
/close [queue-type]
```
Completely removes the queue embed and deletes it from the database.

**Example:**
```
/close hero-realm
```

#### Change Language
```
/language [language]
```
Change the bot's language for your server. Supports English and Vietnamese.

**Example:**
```
/language Vietnamese
```

### Player Interaction

Once a queue is created, players can interact with it using buttons:

1. **Join a Queue**: Click on Tank, Healer, or DPS button
2. **Leave a Queue**: Click the "Leave Queue" button (shown after joining)

**Rules:**
- Players can only be in one queue at a time
- Queues have a maximum capacity (5 for Sword Trial, 10 for Hero Realm)
- Any role composition is valid (no enforcement)

### Queue Full Notification

When a queue reaches full capacity, the bot automatically:
- Sends a notification in the channel
- Pings all players in the queue
- Displays "Queue is full!" message

## Queue Embed Example

```
┌───────────────────────────────────┐
│ 🗡️ Sword Trial Queue              │
│ [Your Server Name]                 │
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

[🛡️ Tank] [💚 Healer] [⚔️ DPS]
```

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+ (strict mode)
- **Discord Library**: discord.js 14.x
- **Database**: SQLite via better-sqlite3 (synchronous operations)
- **Deployment**: Railway/Render/Fly.io compatible

### Project Structure

```
wwm-queue/
├── src/
│   ├── index.ts              # Main bot entry point
│   ├── commands/             # Slash command handlers
│   ├── components/           # Button interaction handlers
│   ├── database/             # SQLite operations
│   ├── models/               # Queue business logic
│   ├── utils/                # Embed builders, constants
│   └── types/                # TypeScript interfaces
├── dist/                     # Compiled JavaScript
├── data/                     # SQLite database
└── [config files]
```

For detailed architecture documentation, see [CLAUDE.md](CLAUDE.md).

## Development

### Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server

### Database

The bot uses SQLite for persistent storage. The database file is created automatically at `data/queues.db`.

**Schema:**
- `queues` - Queue metadata (message ID, guild, channel, type, capacity)
- `queue_players` - Player entries (user ID, username, role, join time)

### State Restoration

When the bot restarts, it automatically:
1. Loads all queues from the database
2. Verifies the Discord messages still exist
3. Updates embeds to match database state
4. Cleans up orphaned records (deleted messages/channels)

## Deployment

### Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Add environment variables (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`)
4. Add a persistent volume mounted to `/app/data`
5. Deploy automatically on push

### Render

1. Create a new Background Worker
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy

### Fly.io

1. Install Fly CLI
2. Run `fly launch`
3. Configure environment variables: `fly secrets set DISCORD_TOKEN=...`
4. Deploy: `fly deploy`

## Troubleshooting

### Bot Not Responding to Commands

- Verify the bot is online and connected
- Check that slash commands are registered (may take up to 1 hour to propagate)
- Ensure the bot has required permissions
- Check console logs for errors

### Buttons Not Working

- Verify bot has "Read Message History" permission
- Check interaction token hasn't expired (15min limit)
- Ensure bot has "Send Messages" permission

### Queue State Lost After Restart

- Check `DATABASE_PATH` environment variable
- Verify `data/` directory exists and is writable
- Check database file permissions
- Review state restoration logs

### Permission Errors

The bot requires these permissions:
- Send Messages
- Embed Links
- Read Message History
- Manage Messages (optional)
- Mention Everyone (optional)

Re-invite the bot with updated permissions if needed.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For bugs, feature requests, or questions:
- Open an issue on GitHub
- Check [CLAUDE.md](CLAUDE.md) for detailed technical documentation

## Roadmap

**Current Version: 1.0.0** (MVP)

**Future Enhancements:**
- Queue history and statistics
- AFK check before queue notifications
- Queue cooldown to prevent spam
- Role balance suggestions
- Multiple queues per type (Morning/Evening sessions)
- Queue templates with custom capacities
- Scheduled queues with start times

## Credits

Built for the **Where Winds Meet** gaming community.

## Changelog

### v1.1.0 (Current)
- ✨ New: `/language` command for multilingual support (English/Vietnamese)
- ✨ New: Guild-specific command registration for instant updates during development
- 🌐 Added language preference system
- 📝 Updated documentation

### v1.0.0 (Initial Release)
- Sword Trial queue (5 players)
- Hero Realm queue (10 players)
- Role selection (Tank, Healer, DPS)
- Persistent state across restarts
- Admin commands (/setup, /reset, /close)
- Auto-notifications when queue is full

---

Made with ❤️ for the Where Winds Meet community
