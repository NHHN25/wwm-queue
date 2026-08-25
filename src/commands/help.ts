import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getGuildTranslations } from '../localization/index.js';
import { COLORS } from '../utils/constants.js';

/**
 * `/help` — one embed explaining everything the bot does.
 *
 * Open to everyone, not just admins: members use it to find `/baodanh`, and
 * server owners use it as the setup guide.
 */
export function buildHelpCommand(): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show what this bot does and how to set it up')
    .setDescriptionLocalizations({
      vi: 'Xem bot làm được gì và cách cài đặt',
    })
    .addBooleanOption((opt) =>
      opt
        .setName('public')
        .setDescription('Post the guide in the channel instead of only to you')
        .setDescriptionLocalizations({
          vi: 'Đăng hướng dẫn ra kênh thay vì chỉ mình bạn thấy',
        })
        .setRequired(false)
    )
    .setDMPermission(false) as SlashCommandBuilder;
}

/**
 * Build the guide embed in the guild's language
 */
export function createHelpEmbed(guildId: string, guildName?: string): EmbedBuilder {
  const t = getGuildTranslations(guildId);
  const help = t.help;

  const embed = new EmbedBuilder()
    .setTitle(help.title)
    .setColor(COLORS.PRIMARY)
    .setDescription(help.intro)
    .addFields(
      { name: help.quickStartTitle, value: help.quickStart },
      { name: help.guildWarTitle, value: help.guildWarBody },
      { name: help.queuesTitle, value: help.queuesBody },
      { name: help.profilesTitle, value: help.profilesBody },
      { name: help.verificationTitle, value: help.verificationBody },
      { name: help.settingsTitle, value: help.settingsBody },
      { name: '​', value: help.adminNote }
    )
    .setFooter({ text: help.footer });

  if (guildName) {
    embed.setAuthor({ name: guildName });
  }

  return embed;
}

/**
 * Handle `/help`
 */
export async function handleHelpCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const guildId = interaction.guildId ?? '';
  const isPublic = interaction.options.getBoolean('public') ?? false;

  await interaction.reply({
    embeds: [createHelpEmbed(guildId, interaction.guild?.name)],
    ephemeral: !isPublic,
  });
}
