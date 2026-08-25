import { Client, TextChannel } from 'discord.js';
import * as db from '../database/database.js';
import { GuildWarEvent } from '../models/GuildWarEvent.js';
import { getGuildTranslations } from '../localization/index.js';
import {
  GUILD_WAR_MIN_NUDGE_GAP_MS,
  GUILD_WAR_TICK_INTERVAL_MS,
} from './guildWarConstants.js';
import {
  buildGuildWarNudgeMessage,
  buildGuildWarPingMessages,
  createAttendanceButtons,
  createGuildWarButtons,
  createGuildWarEmbed,
} from './guildWarEmbeds.js';
import {
  getLocalDayBounds,
  planUpcomingGuildWarEvents,
  shouldAutoOpen,
} from './guildWarTime.js';
import type { GuildWarDay, GuildWarSettingsRow } from '../types/index.js';

/**
 * Guild War scheduler.
 *
 * A single interval re-reads the database every tick rather than arming one
 * timer per event. That keeps the bot correct across restarts and redeploys:
 * state lives in `notified_at` / `nudged_at`, not in memory, so nothing is lost
 * and nothing is sent twice.
 */

let tickHandle: NodeJS.Timeout | null = null;

/**
 * Fetch a text channel, or null if it is gone or unusable
 */
async function fetchTextChannel(
  client: Client,
  channelId: string | null
): Promise<TextChannel | null> {
  if (!channelId) {
    return null;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel?.isTextBased()) {
      return null;
    }

    return channel as TextChannel;
  } catch {
    return null;
  }
}

/**
 * Where reminders go: the announcement channel, falling back to the channel
 * holding the registration embed so a misconfigured guild still gets pinged.
 */
async function resolveAnnounceChannel(
  client: Client,
  settings: GuildWarSettingsRow,
  event: GuildWarEvent
): Promise<TextChannel | null> {
  const announce = await fetchTextChannel(client, settings.announce_channel_id);

  if (announce) {
    return announce;
  }

  return fetchTextChannel(client, event.getChannelId());
}

export interface OpenedGuildWarEvent {
  event: GuildWarEvent;
  posted: boolean;
}

/**
 * Open registration for the coming weekend.
 *
 * Saturday and Sunday are separate events with separate embeds. An event that
 * already exists for the same start time is returned untouched, so calling
 * this twice (auto-open plus a manual `/guildwar open`) is harmless.
 */
export async function openGuildWarEvents(
  client: Client,
  guildId: string,
  options: {
    now?: Date;
    days?: GuildWarDay[];
    channelId?: string;
  } = {}
): Promise<OpenedGuildWarEvent[]> {
  const now = options.now ?? new Date();
  const settings = db.getOrCreateGuildWarSettings(guildId);
  const channelId = options.channelId ?? settings.registration_channel_id;

  if (!channelId) {
    return [];
  }

  const t = getGuildTranslations(guildId);
  const guild = client.guilds.cache.get(guildId);

  const planned = planUpcomingGuildWarEvents(now, {
    timezone: settings.timezone,
    satTime: settings.sat_time,
    sunTime: settings.sun_time,
    notifyLeadMin: settings.notify_lead_min,
    nudgeLeadMin: settings.nudge_lead_min,
  }).filter((plan) => !options.days || options.days.includes(plan.day));

  const results: OpenedGuildWarEvent[] = [];

  for (const plan of planned) {
    // One Guild War per day. Compare the whole local day, not the exact
    // instant, so an event an admin already opened still counts even after the
    // configured start time changes.
    const bounds = getLocalDayBounds(plan.eventAt, settings.timezone);
    const existingRow = db.getGuildWarEventBetween(guildId, bounds.start, bounds.end);

    if (existingRow) {
      results.push({ event: GuildWarEvent.fromRow(existingRow), posted: false });
      continue;
    }

    const event = GuildWarEvent.create(
      guildId,
      channelId,
      plan.day,
      plan.eventAt,
      plan.notifyAt,
      plan.nudgeAt,
      settings.capacity
    );

    const channel = await fetchTextChannel(client, channelId);

    if (!channel) {
      // Keep the row: an admin can re-point the channel and the reminder still fires
      results.push({ event, posted: false });
      continue;
    }

    const embed = createGuildWarEmbed(event.getData(), [], t, {
      guildName: guild?.name,
      sideNames: {
        offense: settings.team_offense_name,
        defense: settings.team_defense_name,
      },
      notifyLeadMin: settings.notify_lead_min,
    });

    const message = await channel.send({
      embeds: [embed],
      components: [createGuildWarButtons(event.getId(), t)],
    });

    event.setMessageId(message.id);

    results.push({ event, posted: true });
  }

  return results;
}

/**
 * Outcome of a reminder attempt.
 * `no-channel` is retryable; the other two are final for this event.
 */
export type PingOutcome = 'sent' | 'empty' | 'no-channel';

/**
 * Send the main T-minus reminder for an event, one message per side
 */
export async function sendGuildWarPing(
  client: Client,
  event: GuildWarEvent
): Promise<PingOutcome> {
  const guildId = event.getGuildId();
  const settings = db.getOrCreateGuildWarSettings(guildId);
  const t = getGuildTranslations(guildId);

  const channel = await resolveAnnounceChannel(client, settings, event);

  if (!channel) {
    console.error(`[GuildWar] No announce channel for event ${event.getId()}`);
    return 'no-channel';
  }

  const messages = buildGuildWarPingMessages(event.getData(), event.getSignups(), t, {
    sideNames: {
      offense: settings.team_offense_name,
      defense: settings.team_defense_name,
    },
  });

  for (const message of messages) {
    await channel.send({
      content: message.content,
      components: [createAttendanceButtons(event.getId())],
      allowedMentions: { users: message.userIds },
    });
  }

  return messages.length > 0 ? 'sent' : 'empty';
}

/**
 * Nudge everyone who has not answered the main reminder
 */
export async function sendGuildWarNudge(
  client: Client,
  event: GuildWarEvent
): Promise<boolean> {
  const guildId = event.getGuildId();
  const settings = db.getOrCreateGuildWarSettings(guildId);
  const t = getGuildTranslations(guildId);

  const message = buildGuildWarNudgeMessage(
    event.getData(),
    event.getUnconfirmed(),
    t,
    settings.nudge_lead_min
  );

  if (!message) {
    return false;
  }

  const channel = await resolveAnnounceChannel(client, settings, event);

  if (!channel) {
    return false;
  }

  await channel.send({
    content: message.content,
    components: [createAttendanceButtons(event.getId())],
    allowedMentions: { users: message.userIds },
  });

  return true;
}

/**
 * Re-render an event's registration embed
 */
async function refreshEventMessage(client: Client, event: GuildWarEvent): Promise<void> {
  const messageId = event.getMessageId();

  if (!messageId) {
    return;
  }

  const guildId = event.getGuildId();
  const settings = db.getOrCreateGuildWarSettings(guildId);
  const t = getGuildTranslations(guildId);

  const channel = await fetchTextChannel(client, event.getChannelId());

  if (!channel) {
    return;
  }

  try {
    const message = await channel.messages.fetch(messageId);

    const embed = createGuildWarEmbed(event.getData(), event.getSignups(), t, {
      guildName: client.guilds.cache.get(guildId)?.name,
      sideNames: {
        offense: settings.team_offense_name,
        defense: settings.team_defense_name,
      },
      notifyLeadMin: settings.notify_lead_min,
      profiles: event.getProfiles(),
    });

    await message.edit({
      embeds: [embed],
      components: [createGuildWarButtons(event.getId(), t, !event.isOpen())],
    });
  } catch (error) {
    console.error(`[GuildWar] Failed to refresh message ${messageId}:`, error);
  }
}

/**
 * What a single tick did. Returned so tests can assert on it.
 */
export interface GuildWarTickResult {
  opened: number;
  notified: number;
  nudged: number;
  finished: number;
}

/**
 * One scheduler pass.
 *
 * Exported and parameterised by `now` so it can be driven with a fake clock in
 * tests instead of waiting for real time to pass.
 */
export async function runGuildWarTick(
  client: Client,
  now: Date = new Date()
): Promise<GuildWarTickResult> {
  const result: GuildWarTickResult = { opened: 0, notified: 0, nudged: 0, finished: 0 };

  // 1. Weekly auto-open
  for (const settings of db.getAutoOpenGuildWarSettings()) {
    const lastOpened = settings.last_auto_open_at
      ? new Date(settings.last_auto_open_at)
      : null;

    const due = shouldAutoOpen(
      now,
      {
        timezone: settings.timezone,
        openWeekday: settings.open_weekday,
        openTime: settings.open_time,
      },
      lastOpened
    );

    if (!due) {
      continue;
    }

    try {
      const opened = await openGuildWarEvents(client, settings.guild_id, { now });
      db.markGuildWarAutoOpened(settings.guild_id, now);
      result.opened += opened.filter((o) => o.posted).length;
    } catch (error) {
      console.error(`[GuildWar] Auto-open failed for guild ${settings.guild_id}:`, error);
    }
  }

  // 2. Main reminder
  for (const row of db.getGuildWarEventsDueForNotify(now)) {
    const event = GuildWarEvent.fromRow(row);

    try {
      const outcome = await sendGuildWarPing(client, event);

      // An unreachable channel is left unmarked so the reminder retries once
      // an admin fixes it. An empty roster is marked, so it is not retried.
      if (outcome === 'no-channel') {
        continue;
      }

      event.markNotified(now);
      await refreshEventMessage(client, event);
      result.notified++;
    } catch (error) {
      console.error(`[GuildWar] Ping failed for event ${row.id}:`, error);
    }
  }

  // 3. Follow-up nudge
  const nudgeCutoff = new Date(now.getTime() - GUILD_WAR_MIN_NUDGE_GAP_MS);

  for (const row of db.getGuildWarEventsDueForNudge(now, nudgeCutoff)) {
    const event = GuildWarEvent.fromRow(row);

    try {
      await sendGuildWarNudge(client, event);
      event.markNudged(now);
      result.nudged++;
    } catch (error) {
      console.error(`[GuildWar] Nudge failed for event ${row.id}:`, error);
    }
  }

  // 4. Retire events that have started
  for (const row of db.getGuildWarEventsToFinish(now)) {
    const event = GuildWarEvent.fromRow(row);

    try {
      event.setStatus('done');
      await refreshEventMessage(client, event);
      result.finished++;
    } catch (error) {
      console.error(`[GuildWar] Failed to finish event ${row.id}:`, error);
    }
  }

  return result;
}

/**
 * Start the periodic scheduler
 */
export function startGuildWarScheduler(client: Client): void {
  stopGuildWarScheduler();

  const tick = async (): Promise<void> => {
    try {
      const result = await runGuildWarTick(client);

      if (result.opened || result.notified || result.nudged || result.finished) {
        console.log(
          `[GuildWar] Tick: opened ${result.opened}, notified ${result.notified}, ` +
            `nudged ${result.nudged}, finished ${result.finished}`
        );
      }
    } catch (error) {
      console.error('[GuildWar] Scheduler tick failed:', error);
    }
  };

  // Catch up immediately on startup, then settle into the interval
  void tick();

  tickHandle = setInterval(() => void tick(), GUILD_WAR_TICK_INTERVAL_MS);

  console.log(
    `[GuildWar] Scheduler started (every ${GUILD_WAR_TICK_INTERVAL_MS / 1000}s)`
  );
}

/**
 * Stop the periodic scheduler
 */
export function stopGuildWarScheduler(): void {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}
