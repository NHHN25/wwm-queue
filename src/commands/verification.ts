import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import {
  setVerificationSettings,
  disableVerificationSettings,
} from '../database/database.js';
import {
  validateVerificationPermissions,
  validateRoleHierarchy,
} from '../utils/verificationHelpers.js';
import { getGuildTranslations } from '../localization/index.js';

/**
 * /setupverification command
 * Configure the verification system for first-time member registrations
 */
export const setupVerificationCommand = new SlashCommandBuilder()
  .setName('setupverification')
  .setDescription('Set up member verification system')
  .setDescriptionLocalizations({
    vi: 'Thiết lập hệ thống xác minh thành viên',
  })
  .addChannelOption((option) =>
    option
      .setName('reviewchannel')
      .setDescription('Channel where pending registrations are posted')
      .setDescriptionLocalizations({
        vi: 'Kênh đăng các đơn đăng ký chờ duyệt',
      })
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption((option) =>
    option
      .setName('pendingrole')
      .setDescription('Role to remove after approval (optional)')
      .setDescriptionLocalizations({
        vi: 'Vai trò cần xóa sau khi duyệt (tùy chọn)',
      })
      .setRequired(false)
  )
  .addRoleOption((option) =>
    option
      .setName('approvedrole')
      .setDescription('Role to add after approval (optional)')
      .setDescriptionLocalizations({
        vi: 'Vai trò cần thêm sau khi duyệt (tùy chọn)',
      })
      .setRequired(false)
  )
  .addChannelOption((option) =>
    option
      .setName('approvedchannel')
      .setDescription('Channel where approval notifications are sent (optional)')
      .setDescriptionLocalizations({
        vi: 'Kênh gửi thông báo phê duyệt (tùy chọn)',
      })
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

/**
 * /disableverification command
 * Disable the verification system (registrations complete immediately)
 */
export const disableVerificationCommand = new SlashCommandBuilder()
  .setName('disableverification')
  .setDescription('Disable member verification system')
  .setDescriptionLocalizations({
    vi: 'Tắt hệ thống xác minh thành viên',
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

/**
 * Handle /setup-verification command
 */
export async function handleSetupVerification(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  try {
    // Get command options
    const reviewChannel = interaction.options.getChannel('reviewchannel', true);
    const pendingRole = interaction.options.getRole('pendingrole', false);
    const approvedRole = interaction.options.getRole('approvedrole', false);
    const approvedChannel = interaction.options.getChannel('approvedchannel', false);

    // Validate channel type
    if (reviewChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: '❌ Review channel must be a text channel.',
        ephemeral: true,
      });
      return;
    }

    // Validate approved channel type if provided
    if (approvedChannel && approvedChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: '❌ Approved channel must be a text channel.',
        ephemeral: true,
      });
      return;
    }

    // Validate bot permissions
    const missingPerms = validateVerificationPermissions(
      interaction.guild,
      reviewChannel.id
    );

    if (missingPerms.length > 0) {
      await interaction.reply({
        content: `❌ I'm missing these permissions:\n${missingPerms.map((p) => `• ${p}`).join('\n')}\n\nPlease grant these permissions and try again.`,
        ephemeral: true,
      });
      return;
    }

    // Validate role hierarchy
    const roleErrors = validateRoleHierarchy(
      interaction.guild,
      pendingRole?.id || null,
      approvedRole?.id || null
    );

    if (roleErrors.length > 0) {
      await interaction.reply({
        content: `❌ Role configuration error:\n${roleErrors.map((e) => `• ${e}`).join('\n')}`,
        ephemeral: true,
      });
      return;
    }

    // Save settings to database
    const success = setVerificationSettings(
      interaction.guildId,
      reviewChannel.id,
      pendingRole?.id || null,
      approvedRole?.id || null,
      approvedChannel?.id || null
    );

    if (!success) {
      await interaction.reply({
        content: '❌ Failed to save verification settings. Please try again.',
        ephemeral: true,
      });
      return;
    }

    // Build configuration summary
    let summary = `**Review Channel:** ${reviewChannel}\n`;
    if (pendingRole) {
      summary += `**Pending Role:** ${pendingRole} (will be removed on approval)\n`;
    }
    if (approvedRole) {
      summary += `**Approved Role:** ${approvedRole} (will be added on approval)\n`;
    }
    if (approvedChannel) {
      summary += `**Approval Notification Channel:** ${approvedChannel}\n`;
    } else {
      summary += `**Approval Notification Channel:** Same as review channel\n`;
    }

    await interaction.reply({
      content:
        t.verification.verificationEnabled(reviewChannel.toString()) +
        '\n\n' +
        summary,
      ephemeral: false,
    });

    console.log(
      `[Verification] Setup completed for guild ${interaction.guildId} by ${interaction.user.id}`
    );
  } catch (error) {
    console.error('[Verification] Error in setup-verification command:', error);
    await interaction.reply({
      content:
        '❌ An error occurred while setting up verification. Please try again.',
      ephemeral: true,
    });
  }
}

/**
 * Handle /disable-verification command
 */
export async function handleDisableVerification(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  try {
    const success = disableVerificationSettings(interaction.guildId);

    if (!success) {
      await interaction.reply({
        content:
          '❌ Verification is not enabled in this server, or an error occurred.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: t.verification.verificationDisabled,
      ephemeral: false,
    });

    console.log(
      `[Verification] Disabled for guild ${interaction.guildId} by ${interaction.user.id}`
    );
  } catch (error) {
    console.error(
      '[Verification] Error in disable-verification command:',
      error
    );
    await interaction.reply({
      content:
        '❌ An error occurred while disabling verification. Please try again.',
      ephemeral: true,
    });
  }
}
