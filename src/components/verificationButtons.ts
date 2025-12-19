import { ButtonInteraction, PermissionFlagsBits } from 'discord.js';
import {
  getPendingRegistration,
  updatePendingRegistrationStatus,
  getPlayerRegistrationById,
  updatePlayerRegistrationApproval,
} from '../database/database.js';
import {
  createApprovedRegistrationEmbed,
  createRejectedRegistrationEmbed,
} from '../utils/verificationEmbeds.js';
import { applyApprovalActions } from '../utils/verificationHelpers.js';
import { getVerificationSettings } from '../database/database.js';
import { getGuildTranslations } from '../localization/index.js';

/**
 * Handle approval/rejection button interactions
 * Custom ID format: approval_{action}_{userId}
 */
export async function handleApprovalButtonInteraction(
  interaction: ButtonInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  // Parse custom ID
  const parts = interaction.customId.split('_');
  const action = parts[1]; // 'approve' or 'reject'
  const userId = parts[2];

  // Validate admin permission
  const member = interaction.member;
  if (!member || !('permissions' in member)) {
    await interaction.reply({
      content: t.verification.errorNotAdmin,
      ephemeral: true,
    });
    return;
  }

  // Check if permissions is a PermissionsBitField (not a string)
  if (
    typeof member.permissions === 'string' ||
    !member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    await interaction.reply({
      content: t.verification.errorNotAdmin,
      ephemeral: true,
    });
    return;
  }

  try {
    // Fetch pending registration
    const pendingReg = getPendingRegistration(interaction.guildId, userId);

    if (!pendingReg) {
      await interaction.reply({
        content: t.verification.errorAlreadyProcessed,
        ephemeral: true,
      });
      return;
    }

    // Check status is pending
    if (pendingReg.status !== 'pending') {
      await interaction.reply({
        content: t.verification.errorAlreadyProcessed,
        ephemeral: true,
      });
      return;
    }

    // Fetch player registration
    const registration = getPlayerRegistrationById(pendingReg.registration_id);

    if (!registration) {
      await interaction.reply({
        content: '❌ Registration data not found.',
        ephemeral: true,
      });
      return;
    }

    // Fetch member from guild
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(userId);
    } catch (error) {
      // Member left the server
      await interaction.reply({
        content: t.verification.errorMemberLeft,
        ephemeral: true,
      });

      // Mark as rejected in database
      updatePendingRegistrationStatus(
        pendingReg.id,
        'rejected',
        interaction.user.id
      );
      updatePlayerRegistrationApproval(
        registration.id,
        'rejected',
        interaction.user.id
      );

      return;
    }

    // Defer reply since approval actions may take time
    await interaction.deferUpdate();

    if (action === 'approve') {
      // Apply approval actions (nickname change, role management)
      const verificationSettings = getVerificationSettings(interaction.guildId);

      let errors: string[] = [];
      if (verificationSettings) {
        errors = await applyApprovalActions(
          targetMember,
          registration,
          verificationSettings
        );
      }

      // Update database
      updatePendingRegistrationStatus(
        pendingReg.id,
        'approved',
        interaction.user.id
      );
      updatePlayerRegistrationApproval(
        registration.id,
        'approved',
        interaction.user.id
      );

      // Fetch updated registration data
      const updatedRegistration = getPlayerRegistrationById(
        pendingReg.registration_id
      );

      if (!updatedRegistration) {
        console.error(
          '[Verification] Failed to fetch updated registration after approval'
        );
        return;
      }

      // Update embed to show approved status
      const approvedEmbed = createApprovedRegistrationEmbed(
        updatedRegistration,
        targetMember.user,
        interaction.user.username,
        interaction.guildId
      );

      await interaction.editReply({
        embeds: [approvedEmbed],
        components: [], // Remove buttons
      });

      // Send followup message to admin
      if (errors.length > 0) {
        await interaction.followUp({
          content: t.verification.errorMissingPermissions(errors),
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: t.verification.approved,
          ephemeral: true,
        });
      }

      // Ping the player to notify them of approval
      try {
        const guildName = interaction.guild.name;

        // Determine which channel to send the notification to
        const notificationChannelId = verificationSettings?.approved_channel_id || interaction.channelId;
        const notificationChannel = await interaction.guild.channels.fetch(notificationChannelId);

        if (notificationChannel?.isTextBased()) {
          await notificationChannel.send({
            content: `<@${userId}> ${t.verification.approvalNotification(guildName)}`,
          });
        } else {
          // Fallback to current channel if configured channel is unavailable
          await interaction.followUp({
            content: `<@${userId}> ${t.verification.approvalNotification(guildName)}`,
            ephemeral: false,
          });
        }
      } catch (error) {
        console.error('[Verification] Failed to ping user:', error);
      }

      console.log(
        `[Verification] Registration approved for user ${userId} by ${interaction.user.id}`
      );
    } else if (action === 'reject') {
      // Update database
      updatePendingRegistrationStatus(
        pendingReg.id,
        'rejected',
        interaction.user.id
      );
      updatePlayerRegistrationApproval(
        registration.id,
        'rejected',
        interaction.user.id
      );

      // Fetch updated registration data
      const updatedRegistration = getPlayerRegistrationById(
        pendingReg.registration_id
      );

      if (!updatedRegistration) {
        console.error(
          '[Verification] Failed to fetch updated registration after rejection'
        );
        return;
      }

      // Update embed to show rejected status
      const rejectedEmbed = createRejectedRegistrationEmbed(
        updatedRegistration,
        targetMember.user,
        interaction.user.username,
        interaction.guildId
      );

      await interaction.editReply({
        embeds: [rejectedEmbed],
        components: [], // Remove buttons
      });

      await interaction.followUp({
        content: t.verification.rejected,
        ephemeral: true,
      });

      console.log(
        `[Verification] Registration rejected for user ${userId} by ${interaction.user.id}`
      );
    }
  } catch (error) {
    console.error('[Verification] Error handling approval interaction:', error);

    const errorReply = {
      content:
        '❌ An error occurred while processing the approval. Please try again.',
      ephemeral: true,
    };

    if (interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
}
