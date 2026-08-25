import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import * as db from '../database/database.js';
import { GuildWarEvent } from '../models/GuildWarEvent.js';
import { getGuildTranslations } from '../localization/index.js';
import {
  getDayName,
  getSideName,
  GUILD_WAR_SIDE_ORDER,
} from '../utils/guildWarConstants.js';
import {
  buildGuildWarRosterText,
} from '../utils/guildWarEmbeds.js';
import {
  createOrganizerComponents,
  createOrganizerEmbed,
} from '../components/guildWarOrganizer.js';
import {
  openGuildWarEvents,
  sendGuildWarPing,
} from '../utils/guildWarScheduler.js';
import {
  discordTimestamp,
  isValidTimezone,
  parseHHMM,
} from '../utils/guildWarTime.js';
import type { GuildWarDay } from '../types/index.js';

/**
 * `/guildwar` — scheduling, organizing and reminders for Guild War.
 *
 * Admin-only. Players never type a command: they use the Register button on
 * the embed this command posts.
 */
export function buildGuildWarCommands(): SlashCommandBuilder[] {
  const command = new SlashCommandBuilder()
    .setName('guildwar')
    .setDescription('Manage Guild War registration and reminders')
    .setDescriptionLocalizations({
      vi: 'Quản lý đăng ký và nhắc nhở Bang Chiến',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  command.addSubcommand((sub) =>
    sub
      .setName('schedule')
      .setDescription('Configure Guild War times, channels and team names')
      .setDescriptionLocalizations({
        vi: 'Cài đặt giờ, kênh và tên đội cho Bang Chiến',
      })
      .addChannelOption((opt) =>
        opt
          .setName('registration-channel')
          .setDescription('Channel where registration embeds are posted')
          .setDescriptionLocalizations({ vi: 'Kênh đăng ký' })
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName('announce-channel')
          .setDescription('Channel for reminders')
          .setDescriptionLocalizations({ vi: 'Kênh gửi thông báo nhắc nhở' })
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('sat-time')
          .setDescription('Saturday start time, 24h HH:MM (e.g. 20:00)')
          .setDescriptionLocalizations({ vi: 'Giờ bắt đầu Thứ 7, dạng HH:MM' })
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('sun-time')
          .setDescription('Sunday start time, 24h HH:MM (e.g. 20:00)')
          .setDescriptionLocalizations({ vi: 'Giờ bắt đầu Chủ Nhật, dạng HH:MM' })
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('timezone')
          .setDescription('Timezone, e.g. Asia/Ho_Chi_Minh')
          .setDescriptionLocalizations({ vi: 'Múi giờ, vd: Asia/Ho_Chi_Minh' })
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('open-time')
          .setDescription('Thursday time to auto-open registration, HH:MM')
          .setDescriptionLocalizations({
            vi: 'Giờ tự động mở đăng ký vào Thứ 5, dạng HH:MM',
          })
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('notify-lead')
          .setDescription('Minutes before start for the main reminder')
          .setDescriptionLocalizations({ vi: 'Số phút nhắc trước giờ bắt đầu' })
          .setMinValue(5)
          .setMaxValue(720)
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('nudge-lead')
          .setDescription('Minutes before start for the follow-up nudge')
          .setDescriptionLocalizations({ vi: 'Số phút nhắc lần hai trước giờ bắt đầu' })
          .setMinValue(1)
          .setMaxValue(120)
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('capacity')
          .setDescription('Maximum players per event')
          .setDescriptionLocalizations({ vi: 'Số người tối đa mỗi buổi' })
          .setMinValue(2)
          .setMaxValue(100)
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('offense-name')
          .setDescription('Custom name for the offense team')
          .setDescriptionLocalizations({ vi: 'Tên đội tùy chỉnh cho đội Công' })
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('defense-name')
          .setDescription('Custom name for the defense team')
          .setDescriptionLocalizations({ vi: 'Tên đội tùy chỉnh cho đội Thủ' })
          .setRequired(false)
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('open')
      .setDescription('Open registration for the coming weekend')
      .setDescriptionLocalizations({ vi: 'Mở đăng ký cho cuối tuần tới' })
      .addStringOption((opt) =>
        opt
          .setName('day')
          .setDescription('Which day to open (default: both)')
          .setDescriptionLocalizations({ vi: 'Mở ngày nào (mặc định: cả hai)' })
          .setRequired(false)
          .addChoices(
            { name: 'Both', value: 'both' },
            { name: 'Saturday', value: 'sat' },
            { name: 'Sunday', value: 'sun' }
          )
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('teams')
      .setDescription('Organize players into teams')
      .setDescriptionLocalizations({ vi: 'Sắp xếp người chơi vào các đội' })
      .addStringOption((opt) =>
        opt
          .setName('day')
          .setDescription('Which event to organize (default: the next one)')
          .setDescriptionLocalizations({ vi: 'Sắp xếp buổi nào (mặc định: buổi gần nhất)' })
          .setRequired(false)
          .addChoices(
            { name: 'Saturday', value: 'sat' },
            { name: 'Sunday', value: 'sun' }
          )
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('roster')
      .setDescription('Show the roster as plain text')
      .setDescriptionLocalizations({ vi: 'Xem danh sách dạng văn bản' })
      .addStringOption((opt) =>
        opt
          .setName('day')
          .setDescription('Which event (default: the next one)')
          .setDescriptionLocalizations({ vi: 'Buổi nào (mặc định: buổi gần nhất)' })
          .setRequired(false)
          .addChoices(
            { name: 'Saturday', value: 'sat' },
            { name: 'Sunday', value: 'sun' }
          )
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('ping')
      .setDescription('Send the reminder now')
      .setDescriptionLocalizations({ vi: 'Gửi nhắc nhở ngay bây giờ' })
      .addStringOption((opt) =>
        opt
          .setName('day')
          .setDescription('Which event (default: the next one)')
          .setDescriptionLocalizations({ vi: 'Buổi nào (mặc định: buổi gần nhất)' })
          .setRequired(false)
          .addChoices(
            { name: 'Saturday', value: 'sat' },
            { name: 'Sunday', value: 'sun' }
          )
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('auto')
      .setDescription('Turn weekly auto-open on or off')
      .setDescriptionLocalizations({ vi: 'Bật/tắt tự động mở đăng ký hàng tuần' })
      .addBooleanOption((opt) =>
        opt
          .setName('enabled')
          .setDescription('Whether registration opens automatically each week')
          .setDescriptionLocalizations({ vi: 'Có tự động mở đăng ký mỗi tuần không' })
          .setRequired(true)
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('cancel')
      .setDescription('Cancel an upcoming Guild War')
      .setDescriptionLocalizations({ vi: 'Hủy một buổi Bang Chiến sắp tới' })
      .addStringOption((opt) =>
        opt
          .setName('day')
          .setDescription('Which event to cancel')
          .setDescriptionLocalizations({ vi: 'Hủy buổi nào' })
          .setRequired(true)
          .addChoices(
            { name: 'Saturday', value: 'sat' },
            { name: 'Sunday', value: 'sun' }
          )
      )
  );

  command.addSubcommand((sub) =>
    sub
      .setName('settings')
      .setDescription('Show current Guild War settings')
      .setDescriptionLocalizations({ vi: 'Xem cài đặt Bang Chiến hiện tại' })
  );

  return [command];
}

/**
 * Pick the event an admin means: the requested day, or the soonest upcoming
 */
function resolveEvent(guildId: string, day: GuildWarDay | null): GuildWarEvent | null {
  const upcoming = GuildWarEvent.loadUpcoming(guildId);

  if (upcoming.length === 0) {
    return null;
  }

  if (!day) {
    return upcoming[0];
  }

  return upcoming.find((event) => event.getDay() === day) ?? null;
}

/**
 * Route `/guildwar` subcommands
 */
export async function handleGuildWarCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'schedule':
      await handleSchedule(interaction);
      break;
    case 'open':
      await handleOpen(interaction);
      break;
    case 'teams':
      await handleTeams(interaction);
      break;
    case 'roster':
      await handleRoster(interaction);
      break;
    case 'ping':
      await handlePing(interaction);
      break;
    case 'auto':
      await handleAuto(interaction);
      break;
    case 'cancel':
      await handleCancel(interaction);
      break;
    case 'settings':
      await handleSettings(interaction);
      break;
    default:
      break;
  }
}

async function handleSchedule(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;

  const updates: Parameters<typeof db.updateGuildWarSettings>[1] = {};

  const registrationChannel = interaction.options.getChannel('registration-channel');
  const announceChannel = interaction.options.getChannel('announce-channel');
  const satTime = interaction.options.getString('sat-time');
  const sunTime = interaction.options.getString('sun-time');
  const timezone = interaction.options.getString('timezone');
  const openTime = interaction.options.getString('open-time');
  const notifyLead = interaction.options.getInteger('notify-lead');
  const nudgeLead = interaction.options.getInteger('nudge-lead');
  const capacity = interaction.options.getInteger('capacity');
  const offenseName = interaction.options.getString('offense-name');
  const defenseName = interaction.options.getString('defense-name');

  // Validate every time value before writing anything
  for (const value of [satTime, sunTime, openTime]) {
    if (value !== null && !parseHHMM(value)) {
      await interaction.reply({ content: gw.errorInvalidTime, ephemeral: true });
      return;
    }
  }

  if (timezone !== null && !isValidTimezone(timezone)) {
    await interaction.reply({ content: gw.errorInvalidTimezone, ephemeral: true });
    return;
  }

  if (registrationChannel) {
    updates.registrationChannelId = registrationChannel.id;
  }
  if (announceChannel) {
    updates.announceChannelId = announceChannel.id;
  }
  if (satTime) {
    updates.satTime = satTime;
  }
  if (sunTime) {
    updates.sunTime = sunTime;
  }
  if (timezone) {
    updates.timezone = timezone;
  }
  if (openTime) {
    updates.openTime = openTime;
  }
  if (notifyLead !== null) {
    updates.notifyLeadMin = notifyLead;
  }
  if (nudgeLead !== null) {
    updates.nudgeLeadMin = nudgeLead;
  }
  if (capacity !== null) {
    updates.capacity = capacity;
  }
  if (offenseName !== null) {
    updates.teamOffenseName = offenseName;
  }
  if (defenseName !== null) {
    updates.teamDefenseName = defenseName;
  }

  db.updateGuildWarSettings(guildId, updates);

  await interaction.reply({
    content: `${gw.settingsUpdated}\n\n${describeSettings(guildId)}`,
    ephemeral: true,
  });
}

/**
 * Human-readable summary of the guild's current configuration
 */
function describeSettings(guildId: string): string {
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;
  const settings = db.getOrCreateGuildWarSettings(guildId);

  const sideNames = {
    offense: settings.team_offense_name,
    defense: settings.team_defense_name,
  };

  const lines = [
    `${gw.dayNameSat}: \`${settings.sat_time}\``,
    `${gw.dayNameSun}: \`${settings.sun_time}\``,
    `🌏 \`${settings.timezone}\``,
    `📥 ${settings.registration_channel_id ? `<#${settings.registration_channel_id}>` : '—'}`,
    `📣 ${settings.announce_channel_id ? `<#${settings.announce_channel_id}>` : '—'}`,
    `⏰ ${settings.notify_lead_min}m / ${settings.nudge_lead_min}m`,
    `👥 ${settings.capacity}`,
    GUILD_WAR_SIDE_ORDER.map((side) => getSideName(side, t, sideNames)).join(' · '),
    settings.auto_open ? gw.autoOpenOn : gw.autoOpenOff,
  ];

  return gw.settingsSummary(lines);
}

async function handleOpen(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;

  const settings = db.getOrCreateGuildWarSettings(guildId);
  const dayOption = interaction.options.getString('day') ?? 'both';

  const channelId = settings.registration_channel_id ?? interaction.channelId;

  if (!channelId) {
    await interaction.reply({ content: gw.errorNoRegistrationChannel, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const days: GuildWarDay[] | undefined =
    dayOption === 'both' ? undefined : [dayOption as GuildWarDay];

  const opened = await openGuildWarEvents(interaction.client, guildId, {
    days,
    channelId,
  });

  if (opened.length === 0) {
    await interaction.editReply({ content: gw.errorNoRegistrationChannel });
    return;
  }

  const lines = opened.map((entry) => {
    const dayName = getDayName(entry.event.getDay(), t);

    return entry.posted
      ? gw.eventCreated(
          dayName,
          discordTimestamp(entry.event.getEventAt(), 'F'),
          `<#${entry.event.getChannelId()}>`
        )
      : gw.eventAlreadyExists(dayName);
  });

  await interaction.editReply({ content: lines.join('\n') });
}

async function handleTeams(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const day = interaction.options.getString('day') as GuildWarDay | null;

  const event = resolveEvent(guildId, day);

  if (!event) {
    await interaction.reply({
      content: t.guildWarEvent.errorNoEvent,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [createOrganizerEmbed(event, t)],
    components: createOrganizerComponents(event, t),
    ephemeral: true,
  });
}

async function handleRoster(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const day = interaction.options.getString('day') as GuildWarDay | null;

  const event = resolveEvent(guildId, day);

  if (!event) {
    await interaction.reply({
      content: t.guildWarEvent.errorNoEvent,
      ephemeral: true,
    });
    return;
  }

  const settings = db.getOrCreateGuildWarSettings(guildId);

  const roster = buildGuildWarRosterText(event.getData(), event.getSignups(), t, {
    sideNames: {
      offense: settings.team_offense_name,
      defense: settings.team_defense_name,
    },
  });

  await interaction.reply({ content: roster, ephemeral: true });
}

async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;
  const day = interaction.options.getString('day') as GuildWarDay | null;

  const event = resolveEvent(guildId, day);

  if (!event) {
    await interaction.reply({ content: gw.errorNoEvent, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const outcome = await sendGuildWarPing(interaction.client, event);

  if (outcome === 'empty') {
    await interaction.editReply({ content: gw.noSignups });
    return;
  }

  if (outcome === 'no-channel') {
    await interaction.editReply({ content: gw.errorNoAnnounceChannel });
    return;
  }

  // A manual ping counts as the main reminder, so the scheduler will not repeat it
  event.markNotified();

  await interaction.editReply({
    content: gw.pingSent(getDayName(event.getDay(), t)),
  });
}

async function handleAuto(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const enabled = interaction.options.getBoolean('enabled', true);

  db.updateGuildWarSettings(guildId, { autoOpen: enabled });

  await interaction.reply({
    content: enabled ? t.guildWarEvent.autoOpenOn : t.guildWarEvent.autoOpenOff,
    ephemeral: true,
  });
}

async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId as string;
  const t = getGuildTranslations(guildId);
  const gw = t.guildWarEvent;
  const day = interaction.options.getString('day', true) as GuildWarDay;

  const event = resolveEvent(guildId, day);

  if (!event) {
    await interaction.reply({ content: gw.errorNoEvent, ephemeral: true });
    return;
  }

  event.setStatus('cancelled');

  // Leave the message in place, greyed out, so players see it was called off
  const { refreshGuildWarMessage } = await import('../components/guildWarButtons.js');
  await refreshGuildWarMessage(interaction.client, event);

  await interaction.reply({
    content: gw.eventCancelled(getDayName(day, t)),
    ephemeral: true,
  });
}

async function handleSettings(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    content: describeSettings(interaction.guildId as string),
    ephemeral: true,
  });
}
