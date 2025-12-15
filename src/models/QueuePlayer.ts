import type { PlayerRole, QueuePlayerData } from '../types/index.js';
import { getRoleEmoji, getRoleDisplayName, EMOJIS } from '../utils/constants.js';

/**
 * Format a player slot for display in embed
 */
export function formatPlayerSlot(
  player: QueuePlayerData | null,
  slotNumber: number
): string {
  if (player) {
    const roleEmoji = getRoleEmoji(player.role);
    const roleName = getRoleDisplayName(player.role);
    return `${slotNumber}. ${roleEmoji} ${roleName} - <@${player.userId}>`;
  } else {
    return `${slotNumber}. ${EMOJIS.EMPTY_SLOT} Empty`;
  }
}

/**
 * Format a player slot with username instead of mention
 * Useful for logging or non-Discord contexts
 */
export function formatPlayerSlotWithUsername(
  player: QueuePlayerData | null,
  slotNumber: number
): string {
  if (player) {
    const roleEmoji = getRoleEmoji(player.role);
    const roleName = getRoleDisplayName(player.role);
    return `${slotNumber}. ${roleEmoji} ${roleName} - ${player.username}`;
  } else {
    return `${slotNumber}. ${EMOJIS.EMPTY_SLOT} Empty`;
  }
}

/**
 * Get role emoji for a role
 */
export function getPlayerRoleEmoji(role: PlayerRole): string {
  return getRoleEmoji(role);
}

/**
 * Get role display name
 */
export function getPlayerRoleDisplayName(role: PlayerRole): string {
  return getRoleDisplayName(role);
}

/**
 * Format player mention for Discord
 */
export function formatPlayerMention(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Format multiple player mentions as comma-separated list
 */
export function formatPlayerMentions(userIds: string[]): string {
  return userIds.map((id) => `<@${id}>`).join(', ');
}

/**
 * Group players by role
 */
export function groupPlayersByRole(players: QueuePlayerData[]): {
  tanks: QueuePlayerData[];
  healers: QueuePlayerData[];
  dps: QueuePlayerData[];
} {
  const tanks: QueuePlayerData[] = [];
  const healers: QueuePlayerData[] = [];
  const dps: QueuePlayerData[] = [];

  for (const player of players) {
    switch (player.role) {
      case 'tank':
        tanks.push(player);
        break;
      case 'healer':
        healers.push(player);
        break;
      case 'dps':
        dps.push(player);
        break;
    }
  }

  return { tanks, healers, dps };
}

/**
 * Get role distribution as counts
 */
export function getRoleDistribution(players: QueuePlayerData[]): {
  tank: number;
  healer: number;
  dps: number;
} {
  const grouped = groupPlayersByRole(players);

  return {
    tank: grouped.tanks.length,
    healer: grouped.healers.length,
    dps: grouped.dps.length,
  };
}

/**
 * Format role distribution as readable string
 */
export function formatRoleDistribution(players: QueuePlayerData[]): string {
  const dist = getRoleDistribution(players);
  const parts: string[] = [];

  if (dist.tank > 0) {
    parts.push(`${EMOJIS.TANK} ${dist.tank}`);
  }
  if (dist.healer > 0) {
    parts.push(`${EMOJIS.HEALER} ${dist.healer}`);
  }
  if (dist.dps > 0) {
    parts.push(`${EMOJIS.DPS} ${dist.dps}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'No players';
}

/**
 * Validate if a role string is a valid PlayerRole
 */
export function isValidRole(role: string): role is PlayerRole {
  return role === 'tank' || role === 'healer' || role === 'dps';
}

/**
 * Sort players by join time (earliest first)
 */
export function sortPlayersByJoinTime(
  players: QueuePlayerData[]
): QueuePlayerData[] {
  return [...players].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()
  );
}

/**
 * Sort players by role (tank -> healer -> dps), then by join time
 */
export function sortPlayersByRole(
  players: QueuePlayerData[]
): QueuePlayerData[] {
  const roleOrder: Record<PlayerRole, number> = {
    tank: 0,
    healer: 1,
    dps: 2,
  };

  return [...players].sort((a, b) => {
    const roleComparison = roleOrder[a.role] - roleOrder[b.role];
    if (roleComparison !== 0) {
      return roleComparison;
    }
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}

/**
 * Calculate time since player joined (in seconds)
 */
export function getTimeSinceJoined(player: QueuePlayerData): number {
  return Math.floor((Date.now() - player.joinedAt.getTime()) / 1000);
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

/**
 * Create a summary of queue composition
 * Example: "2 Tanks, 1 Healer, 2 DPS"
 */
export function createCompositionSummary(players: QueuePlayerData[]): string {
  const dist = getRoleDistribution(players);
  const parts: string[] = [];

  if (dist.tank > 0) {
    const label = dist.tank === 1 ? 'Tank' : 'Tanks';
    parts.push(`${dist.tank} ${label}`);
  }

  if (dist.healer > 0) {
    const label = dist.healer === 1 ? 'Healer' : 'Healers';
    parts.push(`${dist.healer} ${label}`);
  }

  if (dist.dps > 0) {
    parts.push(`${dist.dps} DPS`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No players';
}

/**
 * Check if queue has balanced composition (optional future feature)
 * This is a placeholder for potential role balance suggestions
 */
export function isBalancedComposition(
  players: QueuePlayerData[],
  _capacity: number
): {
  balanced: boolean;
  suggestions: string[];
} {
  const dist = getRoleDistribution(players);
  const suggestions: string[] = [];

  // Basic heuristics (can be customized)
  if (players.length >= 3 && dist.tank === 0) {
    suggestions.push('Consider adding a Tank');
  }

  if (players.length >= 3 && dist.healer === 0) {
    suggestions.push('Consider adding a Healer');
  }

  if (players.length >= 2 && dist.dps === 0) {
    suggestions.push('Consider adding DPS');
  }

  return {
    balanced: suggestions.length === 0,
    suggestions,
  };
}
