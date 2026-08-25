import type { GuildWarDay, GuildWarSide } from '../types/index.js';
import type { Translations } from '../localization/types.js';

/**
 * Constants and custom-id helpers for scheduled Guild War events.
 *
 * Kept separate from constants.ts, which serves the older ad-hoc queue system.
 */

/**
 * The two sides of a scheduled Guild War.
 * Display names come from translations, or from the guild's custom labels.
 */
export const GUILD_WAR_SIDES: Record<GuildWarSide, { emoji: string; color: number }> = {
  offense: {
    emoji: '⚔️',
    color: 0xe74c3c, // Red
  },
  defense: {
    emoji: '🛡️',
    color: 0x3498db, // Blue
  },
};

/**
 * Order used everywhere a roster is rendered
 */
export const GUILD_WAR_SIDE_ORDER: GuildWarSide[] = ['offense', 'defense'];

/**
 * Default number of signups allowed per event, shared across both sides
 */
export const GUILD_WAR_DEFAULT_CAPACITY = 30;

/**
 * How often the scheduler checks for due reminders and auto-open windows
 */
export const GUILD_WAR_TICK_INTERVAL_MS = 60 * 1000;

/**
 * Minimum gap between the main ping and the follow-up nudge.
 *
 * When the bot comes back from an outage both can be overdue at once; without
 * this, players would be pinged and immediately nudged before they could
 * possibly answer.
 */
export const GUILD_WAR_MIN_NUDGE_GAP_MS = 2 * 60 * 1000;

/**
 * Embed colors by event status
 */
export const GUILD_WAR_COLORS = {
  OPEN: 0x9b59b6, // Purple
  LOCKED: 0xf1c40f, // Yellow
  DONE: 0x95a5a6, // Gray
  CANCELLED: 0x95a5a6, // Gray
} as const;

/**
 * Custom-id prefixes. Each carries the event id so a handler can work out
 * which Guild War it belongs to without any in-memory state.
 */
export const GW_IDS = {
  REGISTER: 'gwe_register',
  WITHDRAW: 'gwe_withdraw',
  TEAM_SELECT: 'gwe_team',
  ROLE_SELECT: 'gwe_role',
  SUBMIT: 'gwe_submit',
  CONFIRM: 'gwe_confirm',
  DECLINE: 'gwe_decline',
  ORG_PLAYER_SELECT: 'gwo_player',
  ORG_MOVE_OFFENSE: 'gwo_moveoff',
  ORG_MOVE_DEFENSE: 'gwo_movedef',
  ORG_BALANCE: 'gwo_balance',
  ORG_REFRESH: 'gwo_refresh',
  ORG_REMOVE: 'gwo_remove',
} as const;

export type GuildWarAction = (typeof GW_IDS)[keyof typeof GW_IDS];

/**
 * Build a custom id carrying an event id
 */
export function buildGuildWarId(action: GuildWarAction, eventId: number): string {
  return `${action}_${eventId}`;
}

/**
 * Parse a Guild War custom id back into its action and event id.
 * Returns null for ids that belong to some other feature.
 */
export function parseGuildWarId(
  customId: string
): { action: GuildWarAction; eventId: number } | null {
  const separator = customId.lastIndexOf('_');

  if (separator === -1) {
    return null;
  }

  const action = customId.slice(0, separator);
  const eventId = Number(customId.slice(separator + 1));

  if (!Number.isInteger(eventId)) {
    return null;
  }

  const known = Object.values(GW_IDS) as string[];

  if (!known.includes(action)) {
    return null;
  }

  return { action: action as GuildWarAction, eventId };
}

/**
 * Localized name of a weekend day
 */
export function getDayName(day: GuildWarDay, t: Translations): string {
  return day === 'sat' ? t.guildWarEvent.dayNameSat : t.guildWarEvent.dayNameSun;
}

/**
 * Display name for a side: the guild's custom label if set, otherwise the
 * localized default (Công / Thủ in Vietnamese, Offense / Defense in English).
 */
export function getSideName(
  side: GuildWarSide,
  t: Translations,
  customNames?: { offense?: string | null; defense?: string | null }
): string {
  const custom = side === 'offense' ? customNames?.offense : customNames?.defense;

  if (custom) {
    return custom;
  }

  return side === 'offense' ? t.guildWar.teamOffense : t.guildWar.teamDefense;
}
