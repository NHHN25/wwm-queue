import * as db from '../database/database.js';
import type {
  GuildWarAttendance,
  GuildWarDay,
  GuildWarEvent as GuildWarEventData,
  GuildWarEventRow,
  GuildWarEventStatus,
  GuildWarSide,
  GuildWarSignup,
  GuildWarSignupRow,
  PlayerRole,
} from '../types/index.js';
import { GUILD_WAR_SIDE_ORDER } from '../utils/guildWarConstants.js';

/**
 * Why a registration attempt failed
 */
export type RegisterFailure = 'locked' | 'full';

export type RegisterResult =
  | { ok: true; updated: boolean }
  | { ok: false; reason: RegisterFailure };

function toEventData(row: GuildWarEventRow): GuildWarEventData {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    day: row.day,
    eventAt: new Date(row.event_at),
    notifyAt: new Date(row.notify_at),
    nudgeAt: new Date(row.nudge_at),
    notifiedAt: row.notified_at ? new Date(row.notified_at) : null,
    nudgedAt: row.nudged_at ? new Date(row.nudged_at) : null,
    capacity: row.capacity,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

function toSignup(row: GuildWarSignupRow): GuildWarSignup {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    username: row.username,
    team: row.team,
    role: row.role,
    attendance: row.attendance,
    assignedBy: row.assigned_by,
    joinedAt: new Date(row.joined_at),
  };
}

/**
 * A scheduled Guild War occurrence and its roster.
 *
 * Wraps the database layer so handlers never touch SQL directly. Every method
 * writes through immediately, matching the synchronous style used by Queue.
 */
export class GuildWarEvent {
  private constructor(private data: GuildWarEventData) {}

  // ==========================================================================
  // Loading
  // ==========================================================================

  static create(
    guildId: string,
    channelId: string,
    day: GuildWarDay,
    eventAt: Date,
    notifyAt: Date,
    nudgeAt: Date,
    capacity: number
  ): GuildWarEvent {
    const id = db.createGuildWarEvent(
      guildId,
      channelId,
      day,
      eventAt,
      notifyAt,
      nudgeAt,
      capacity
    );

    return GuildWarEvent.load(id) as GuildWarEvent;
  }

  static load(eventId: number): GuildWarEvent | null {
    const row = db.getGuildWarEvent(eventId);
    return row ? new GuildWarEvent(toEventData(row)) : null;
  }

  static loadByMessage(messageId: string): GuildWarEvent | null {
    const row = db.getGuildWarEventByMessage(messageId);
    return row ? new GuildWarEvent(toEventData(row)) : null;
  }

  static loadUpcoming(guildId: string): GuildWarEvent[] {
    return db
      .getUpcomingGuildWarEvents(guildId)
      .map((row) => new GuildWarEvent(toEventData(row)));
  }

  static fromRow(row: GuildWarEventRow): GuildWarEvent {
    return new GuildWarEvent(toEventData(row));
  }

  /**
   * Re-read this event from the database
   */
  refresh(): void {
    const row = db.getGuildWarEvent(this.data.id);

    if (row) {
      this.data = toEventData(row);
    }
  }

  // ==========================================================================
  // Accessors
  // ==========================================================================

  getId(): number {
    return this.data.id;
  }

  getGuildId(): string {
    return this.data.guildId;
  }

  getChannelId(): string {
    return this.data.channelId;
  }

  getMessageId(): string | null {
    return this.data.messageId;
  }

  getDay(): GuildWarDay {
    return this.data.day;
  }

  getEventAt(): Date {
    return this.data.eventAt;
  }

  getNotifyAt(): Date {
    return this.data.notifyAt;
  }

  getNudgeAt(): Date {
    return this.data.nudgeAt;
  }

  getCapacity(): number {
    return this.data.capacity;
  }

  getStatus(): GuildWarEventStatus {
    return this.data.status;
  }

  getData(): GuildWarEventData {
    return this.data;
  }

  isOpen(): boolean {
    return this.data.status === 'open';
  }

  isFull(): boolean {
    return this.getSignupCount() >= this.data.capacity;
  }

  // ==========================================================================
  // Roster
  // ==========================================================================

  getSignups(): GuildWarSignup[] {
    return db.getGuildWarSignups(this.data.id).map(toSignup);
  }

  getSignup(userId: string): GuildWarSignup | null {
    const row = db.getGuildWarSignup(this.data.id, userId);
    return row ? toSignup(row) : null;
  }

  getSignupCount(): number {
    return db.getGuildWarSignupCount(this.data.id);
  }

  /**
   * Signups split by side, each in join order
   */
  getSignupsBySide(): Record<GuildWarSide, GuildWarSignup[]> {
    const grouped: Record<GuildWarSide, GuildWarSignup[]> = {
      offense: [],
      defense: [],
    };

    for (const signup of this.getSignups()) {
      grouped[signup.team].push(signup);
    }

    return grouped;
  }

  getState(): { event: GuildWarEventData; signups: GuildWarSignup[] } {
    return {
      event: this.data,
      signups: this.getSignups(),
    };
  }

  /**
   * Attendance tally, for the roster and organizer views
   */
  getAttendanceCounts(): { confirmed: number; declined: number; pending: number } {
    const counts = { confirmed: 0, declined: 0, pending: 0 };

    for (const signup of this.getSignups()) {
      if (signup.attendance === 'confirmed') {
        counts.confirmed++;
      } else if (signup.attendance === 'declined') {
        counts.declined++;
      } else {
        counts.pending++;
      }
    }

    return counts;
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a player, or update their existing team/role choice.
   *
   * Capacity is shared across both sides, so a player already on the roster
   * can always switch sides even when the event is full.
   */
  register(
    userId: string,
    username: string,
    team: GuildWarSide,
    role: PlayerRole
  ): RegisterResult {
    if (!this.isOpen()) {
      return { ok: false, reason: 'locked' };
    }

    const existing = this.getSignup(userId);

    if (!existing && this.isFull()) {
      return { ok: false, reason: 'full' };
    }

    db.upsertGuildWarSignup(this.data.id, userId, username, team, role, null);

    return { ok: true, updated: existing !== null };
  }

  /**
   * Remove a player from the roster
   */
  withdraw(userId: string): boolean {
    return db.removeGuildWarSignup(this.data.id, userId);
  }

  /**
   * Move a player to the other side.
   *
   * Admin action, so it is allowed even after registration locks — organizing
   * usually happens once the roster is final.
   */
  moveToTeam(userId: string, team: GuildWarSide, adminId: string): boolean {
    return db.setGuildWarSignupTeam(this.data.id, userId, team, adminId);
  }

  /**
   * Record a player's answer to the reminder ping
   */
  setAttendance(userId: string, attendance: GuildWarAttendance): boolean {
    return db.setGuildWarAttendance(this.data.id, userId, attendance);
  }

  /**
   * Players who have not answered the reminder yet
   */
  getUnconfirmed(): GuildWarSignup[] {
    return db.getUnconfirmedGuildWarSignups(this.data.id).map(toSignup);
  }

  /**
   * Spread players evenly across both sides, keeping each role balanced.
   *
   * Deals players out role by role, alternating sides, so tanks and healers do
   * not all end up on one side. Admins can still hand-move anyone afterwards.
   */
  autoBalance(adminId: string): void {
    const signups = this.getSignups();
    const byRole: Record<PlayerRole, typeof signups> = {
      tank: [],
      healer: [],
      dps: [],
    };

    for (const signup of signups) {
      byRole[signup.role].push(signup);
    }

    let cursor = 0;

    for (const role of ['tank', 'healer', 'dps'] as PlayerRole[]) {
      for (const signup of byRole[role]) {
        const target = GUILD_WAR_SIDE_ORDER[cursor % GUILD_WAR_SIDE_ORDER.length];
        cursor++;

        if (signup.team !== target) {
          db.setGuildWarSignupTeam(this.data.id, signup.userId, target, adminId);
        }
      }
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  setMessageId(messageId: string): void {
    db.setGuildWarEventMessage(this.data.id, messageId);
    this.data.messageId = messageId;
  }

  markNotified(at: Date = new Date()): void {
    db.markGuildWarNotified(this.data.id, at);
    this.refresh();
  }

  markNudged(at: Date = new Date()): void {
    db.markGuildWarNudged(this.data.id, at);
    this.refresh();
  }

  setStatus(status: GuildWarEventStatus): void {
    db.setGuildWarEventStatus(this.data.id, status);
    this.data.status = status;
  }

  delete(): void {
    db.deleteGuildWarEvent(this.data.id);
  }
}
