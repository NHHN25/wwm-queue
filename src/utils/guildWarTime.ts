import type { GuildWarDay } from '../types/index.js';

/**
 * Timezone-aware date math for Guild War scheduling.
 *
 * Everything stored in the database is UTC. Everything an admin types
 * (event times, the auto-open time) is local to the guild's timezone.
 * These helpers convert between the two using Intl, so no extra dependency
 * is needed and DST is handled by the platform's own tz database.
 */

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Wall-clock fields of an instant, as seen in a given timezone
 */
export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  isoWeekday: number; // 1 = Monday ... 7 = Sunday
}

const ISO_WEEKDAYS: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/**
 * ISO weekday numbers for the two Guild War days
 */
export const GUILD_WAR_WEEKDAYS: Record<GuildWarDay, number> = {
  sat: 6,
  sun: 7,
};

/**
 * Check whether a string is a timezone this runtime knows about
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse an "HH:MM" string
 * Returns null if the string is not a valid 24-hour time.
 */
export function parseHHMM(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

/**
 * Format an hour/minute pair back to "HH:MM"
 */
export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Break an instant into the wall-clock fields seen in a timezone
 */
export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts: Record<string, string> = {};

  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  // Intl renders midnight as "24" in some runtimes; normalize it to 0
  const hour = Number(parts.hour) % 24;

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    isoWeekday: ISO_WEEKDAYS[parts.weekday as string] ?? 1,
  };
}

/**
 * Offset of a timezone at a given instant, in milliseconds
 * Positive east of UTC (Asia/Ho_Chi_Minh is +7h).
 */
export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = getZonedParts(date, timezone);

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  // Drop sub-second precision on both sides so the difference is exact
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock time in a timezone to the matching UTC instant.
 *
 * Two passes: guess using the offset at the naive instant, then re-check the
 * offset at that guess. That settles DST boundaries, where the offset before
 * and after the target differ.
 */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  let result = naive - getTimezoneOffsetMs(new Date(naive), timezone);
  result = naive - getTimezoneOffsetMs(new Date(result), timezone);

  return new Date(result);
}

/**
 * Find the next instant matching a weekday and local time, strictly after `now`.
 *
 * @param isoWeekday 1 = Monday ... 7 = Sunday
 */
export function getNextWeekdayTime(
  now: Date,
  isoWeekday: number,
  time: string,
  timezone: string
): Date {
  const parsed = parseHHMM(time);

  if (!parsed) {
    throw new Error(`Invalid time: ${time}`);
  }

  const nowParts = getZonedParts(now, timezone);

  // How many days forward until that weekday (0 means today)
  let daysAhead = (isoWeekday - nowParts.isoWeekday + 7) % 7;

  // Build the candidate by shifting the local calendar date, not the instant,
  // so a DST jump in between cannot move the wall-clock time.
  const shiftLocalDate = (offsetDays: number): Date => {
    const shifted = new Date(
      Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day) + offsetDays * MS_PER_DAY
    );

    return zonedTimeToUtc(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate(),
      parsed.hour,
      parsed.minute,
      timezone
    );
  };

  let candidate = shiftLocalDate(daysAhead);

  // Today's occurrence has already passed: go to next week
  if (candidate.getTime() <= now.getTime()) {
    daysAhead += 7;
    candidate = shiftLocalDate(daysAhead);
  }

  return candidate;
}

/**
 * The UTC instants bounding a local calendar day.
 *
 * Used to decide whether a Guild War already exists for a given day, whatever
 * time of day it was scheduled at.
 */
export function getLocalDayBounds(
  date: Date,
  timezone: string
): { start: Date; end: Date } {
  const parts = getZonedParts(date, timezone);
  const start = zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, timezone);

  // Step the local calendar date, not the instant, so a DST day still covers
  // exactly one local day
  const nextDay = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + MS_PER_DAY
  );

  const end = zonedTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    timezone
  );

  return { start, end };
}

/**
 * A scheduled Guild War occurrence, before it exists in the database
 */
export interface PlannedGuildWarEvent {
  day: GuildWarDay;
  eventAt: Date;
  notifyAt: Date;
  nudgeAt: Date;
}

export interface GuildWarScheduleConfig {
  timezone: string;
  satTime: string;
  sunTime: string;
  notifyLeadMin: number;
  nudgeLeadMin: number;
}

/**
 * Plan the next Saturday and Sunday events after `now`.
 *
 * Saturday and Sunday are independent events, so each gets its own start time
 * and its own reminder instants. Results are sorted soonest first.
 */
export function planUpcomingGuildWarEvents(
  now: Date,
  config: GuildWarScheduleConfig
): PlannedGuildWarEvent[] {
  const days: Array<{ day: GuildWarDay; time: string }> = [
    { day: 'sat', time: config.satTime },
    { day: 'sun', time: config.sunTime },
  ];

  const planned = days.map(({ day, time }) => {
    const eventAt = getNextWeekdayTime(
      now,
      GUILD_WAR_WEEKDAYS[day],
      time,
      config.timezone
    );

    return {
      day,
      eventAt,
      notifyAt: new Date(eventAt.getTime() - config.notifyLeadMin * MS_PER_MINUTE),
      nudgeAt: new Date(eventAt.getTime() - config.nudgeLeadMin * MS_PER_MINUTE),
    };
  });

  return planned.sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());
}

/**
 * Decide whether the weekly auto-open should fire now.
 *
 * Fires when the configured open time has passed and registration has not
 * already been opened for this cycle. `lastAutoOpenAt` is the guard: after a
 * restart the bot re-checks and stays quiet if it already posted.
 *
 * `graceMs` bounds how late a missed window may still fire, so a bot that was
 * offline for days does not post a stale registration.
 */
export function shouldAutoOpen(
  now: Date,
  config: { timezone: string; openWeekday: number; openTime: string },
  lastAutoOpenAt: Date | null,
  graceMs: number = 2 * MS_PER_DAY
): boolean {
  // getNextWeekdayTime looks forward, so step back a week to get the most
  // recent occurrence at or before now.
  const next = getNextWeekdayTime(now, config.openWeekday, config.openTime, config.timezone);
  const previous = new Date(next.getTime() - 7 * MS_PER_DAY);

  const elapsed = now.getTime() - previous.getTime();

  if (elapsed < 0 || elapsed > graceMs) {
    return false;
  }

  // Already opened at or after the window started
  if (lastAutoOpenAt && lastAutoOpenAt.getTime() >= previous.getTime()) {
    return false;
  }

  return true;
}

/**
 * Render an instant as a Discord timestamp tag.
 * Discord renders these in each viewer's own timezone, so no manual
 * conversion is needed in message text.
 *
 * F = "Saturday, 29 August 2026 20:00", R = "in 3 hours"
 */
export function discordTimestamp(
  date: Date,
  style: 'f' | 'F' | 'R' | 't' | 'T' | 'd' | 'D' = 'F'
): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}
