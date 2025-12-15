import type { QueueType, PlayerRole, QueuePlayerData, QueueState } from '../types/index.js';
import * as db from '../database/database.js';
import { QUEUE_CONFIGS } from '../utils/constants.js';

/**
 * Queue model class
 * Encapsulates queue business logic and database operations
 */
export class Queue {
  private constructor(
    private readonly messageId: string,
    private readonly guildId: string,
    private readonly channelId: string,
    private readonly queueType: QueueType,
    private readonly capacity: number,
    private readonly createdAt: Date
  ) {}

  // ==========================================================================
  // Static Factory Methods
  // ==========================================================================

  /**
   * Create a new queue
   */
  static create(
    messageId: string,
    guildId: string,
    channelId: string,
    queueType: QueueType
  ): Queue {
    const capacity = QUEUE_CONFIGS[queueType].capacity;

    db.createQueue(messageId, guildId, channelId, queueType, capacity);

    return new Queue(
      messageId,
      guildId,
      channelId,
      queueType,
      capacity,
      new Date()
    );
  }

  /**
   * Load an existing queue from database
   * Returns null if queue doesn't exist
   */
  static load(messageId: string): Queue | null {
    const queueRow = db.getQueue(messageId);

    if (!queueRow) {
      return null;
    }

    return new Queue(
      queueRow.message_id,
      queueRow.guild_id,
      queueRow.channel_id,
      queueRow.queue_type,
      queueRow.capacity,
      new Date(queueRow.created_at)
    );
  }

  /**
   * Load all queues for a guild
   */
  static loadAllForGuild(guildId: string): Queue[] {
    const queueRows = db.getGuildQueues(guildId);

    return queueRows.map(
      (row) =>
        new Queue(
          row.message_id,
          row.guild_id,
          row.channel_id,
          row.queue_type,
          row.capacity,
          new Date(row.created_at)
        )
    );
  }

  /**
   * Load all queues across all guilds
   */
  static loadAll(): Queue[] {
    const queueRows = db.getAllQueues();

    return queueRows.map(
      (row) =>
        new Queue(
          row.message_id,
          row.guild_id,
          row.channel_id,
          row.queue_type,
          row.capacity,
          new Date(row.created_at)
        )
    );
  }

  /**
   * Get queue by guild and type
   * Returns null if no queue of that type exists in the guild
   */
  static loadByType(
    guildId: string,
    queueType: QueueType
  ): Queue | null {
    const queueRow = db.getQueueByType(guildId, queueType);

    if (!queueRow) {
      return null;
    }

    return new Queue(
      queueRow.message_id,
      queueRow.guild_id,
      queueRow.channel_id,
      queueRow.queue_type,
      queueRow.capacity,
      new Date(queueRow.created_at)
    );
  }

  // ==========================================================================
  // Player Operations
  // ==========================================================================

  /**
   * Add a player to the queue
   * Returns true if successful, false if player already in queue
   */
  addPlayer(userId: string, username: string, role: PlayerRole): boolean {
    return db.addPlayer(this.messageId, userId, username, role);
  }

  /**
   * Remove a player from the queue
   * Returns true if player was removed, false if not in queue
   */
  removePlayer(userId: string): boolean {
    return db.removePlayer(this.messageId, userId);
  }

  /**
   * Clear all players from the queue
   */
  clear(): void {
    db.clearQueuePlayers(this.messageId);
  }

  /**
   * Delete the queue entirely (including all players via cascade)
   */
  delete(): void {
    db.deleteQueue(this.messageId);
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    const playerCount = db.getQueuePlayerCount(this.messageId);
    return playerCount >= this.capacity;
  }

  /**
   * Check if a specific player is in this queue
   */
  hasPlayer(userId: string): boolean {
    return db.isPlayerInQueue(this.messageId, userId);
  }

  /**
   * Get current player count
   */
  getPlayerCount(): number {
    return db.getQueuePlayerCount(this.messageId);
  }

  /**
   * Get all players in the queue (ordered by join time)
   */
  getPlayers(): QueuePlayerData[] {
    const playerRows = db.getQueuePlayers(this.messageId);

    return playerRows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      role: row.role,
      joinedAt: new Date(row.joined_at),
    }));
  }

  /**
   * Get complete queue state (queue metadata + players)
   * This is the primary method for generating embeds
   */
  getState(): QueueState {
    return {
      queue: {
        messageId: this.messageId,
        guildId: this.guildId,
        channelId: this.channelId,
        queueType: this.queueType,
        capacity: this.capacity,
        createdAt: this.createdAt,
      },
      players: this.getPlayers(),
    };
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getMessageId(): string {
    return this.messageId;
  }

  getGuildId(): string {
    return this.guildId;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getQueueType(): QueueType {
    return this.queueType;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if a user is in any queue in this guild (besides this one)
   * Returns the message ID of the other queue, or null
   */
  getUserOtherQueue(userId: string): string | null {
    const otherQueueMessageId = db.getPlayerQueueInGuild(this.guildId, userId);

    // If user is in this queue, that's fine
    if (otherQueueMessageId === this.messageId) {
      return null;
    }

    return otherQueueMessageId;
  }

  /**
   * Get available slots remaining
   */
  getAvailableSlots(): number {
    const playerCount = this.getPlayerCount();
    return Math.max(0, this.capacity - playerCount);
  }

  /**
   * Get queue progress as percentage (0-100)
   */
  getProgressPercentage(): number {
    const playerCount = this.getPlayerCount();
    return Math.round((playerCount / this.capacity) * 100);
  }

  /**
   * Get display name for this queue type
   */
  getDisplayName(): string {
    return QUEUE_CONFIGS[this.queueType].displayName;
  }

  /**
   * Get emoji for this queue type
   */
  getEmoji(): string {
    return QUEUE_CONFIGS[this.queueType].emoji;
  }

  /**
   * Get color for embed
   */
  getColor(): number {
    return QUEUE_CONFIGS[this.queueType].color;
  }

  /**
   * Convert to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      messageId: this.messageId,
      guildId: this.guildId,
      channelId: this.channelId,
      queueType: this.queueType,
      capacity: this.capacity,
      playerCount: this.getPlayerCount(),
      isFull: this.isFull(),
      availableSlots: this.getAvailableSlots(),
      createdAt: this.createdAt.toISOString(),
    };
  }
}
