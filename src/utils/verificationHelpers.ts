import {
  Guild,
  GuildMember,
  TextChannel,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type {
  PlayerRegistrationRow,
  VerificationSettingsRow,
} from '../types/index.js';
import { createPendingRegistrationEmbed } from './verificationEmbeds.js';
import { createPendingRegistration } from '../database/database.js';
import { getGuildTranslations } from '../localization/index.js';

/**
 * Post a pending registration to the review channel for admin approval
 * Returns the review message ID, or null if failed
 */
export async function postPendingRegistrationForReview(
  guild: Guild,
  member: GuildMember,
  registration: PlayerRegistrationRow,
  verificationSettings: VerificationSettingsRow
): Promise<string | null> {
  try {
    // Fetch review channel
    const reviewChannel = await guild.channels.fetch(
      verificationSettings.review_channel_id
    );

    if (!reviewChannel?.isTextBased()) {
      console.error(
        `[Verification] Review channel ${verificationSettings.review_channel_id} is not a text channel`
      );
      return null;
    }

    const t = getGuildTranslations(guild.id);

    // Create pending registration embed
    const embed = createPendingRegistrationEmbed(
      registration,
      member.user,
      guild.id
    );

    // Create approval buttons
    const approveButton = new ButtonBuilder()
      .setCustomId(`approval_approve_${member.id}`)
      .setLabel(t.verification.approveButton)
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`approval_reject_${member.id}`)
      .setLabel(t.verification.rejectButton)
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      approveButton,
      rejectButton
    );

    // Send to review channel
    const reviewMessage = await (reviewChannel as TextChannel).send({
      embeds: [embed],
      components: [row],
    });

    // Create pending registration entry in database
    const success = createPendingRegistration(
      guild.id,
      member.id,
      reviewMessage.id,
      registration.id
    );

    if (!success) {
      console.error(
        `[Verification] Failed to create pending registration entry for user ${member.id}`
      );
      // Try to delete the review message since DB entry failed
      await reviewMessage.delete().catch(() => {});
      return null;
    }

    console.log(
      `[Verification] Posted pending registration for user ${member.id} to channel ${reviewChannel.id}`
    );
    return reviewMessage.id;
  } catch (error) {
    console.error('[Verification] Error posting pending registration:', error);
    return null;
  }
}

/**
 * Apply approval actions to a member (change nickname, manage roles)
 * Returns an array of error messages (empty if all succeeded)
 */
export async function applyApprovalActions(
  member: GuildMember,
  registration: PlayerRegistrationRow,
  verificationSettings: VerificationSettingsRow
): Promise<string[]> {
  const errors: string[] = [];

  // 1. Change nickname to in-game name
  try {
    await member.setNickname(registration.ingame_name);
    console.log(
      `[Verification] Changed nickname for ${member.id} to "${registration.ingame_name}"`
    );
  } catch (error) {
    console.error('[Verification] Error changing nickname:', error);
    errors.push(`Failed to change nickname: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 2. Remove pending role (if configured)
  if (verificationSettings.pending_role_id) {
    try {
      const pendingRole = member.guild.roles.cache.get(
        verificationSettings.pending_role_id
      );

      if (pendingRole) {
        if (member.roles.cache.has(pendingRole.id)) {
          await member.roles.remove(pendingRole);
          console.log(
            `[Verification] Removed pending role ${pendingRole.name} from ${member.id}`
          );
        }
      } else {
        console.warn(
          `[Verification] Pending role ${verificationSettings.pending_role_id} not found in guild`
        );
        errors.push(
          `Pending role not found (may have been deleted)`
        );
      }
    } catch (error) {
      console.error('[Verification] Error removing pending role:', error);
      errors.push(
        `Failed to remove pending role: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 3. Add approved role (if configured)
  if (verificationSettings.approved_role_id) {
    try {
      const approvedRole = member.guild.roles.cache.get(
        verificationSettings.approved_role_id
      );

      if (approvedRole) {
        if (!member.roles.cache.has(approvedRole.id)) {
          await member.roles.add(approvedRole);
          console.log(
            `[Verification] Added approved role ${approvedRole.name} to ${member.id}`
          );
        }
      } else {
        console.warn(
          `[Verification] Approved role ${verificationSettings.approved_role_id} not found in guild`
        );
        errors.push(
          `Approved role not found (may have been deleted)`
        );
      }
    } catch (error) {
      console.error('[Verification] Error adding approved role:', error);
      errors.push(
        `Failed to add approved role: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return errors;
}

/**
 * Validate that the bot has necessary permissions for verification
 * Returns array of missing permission names (empty if all permissions present)
 */
export function validateVerificationPermissions(
  guild: Guild,
  reviewChannelId: string
): string[] {
  const missing: string[] = [];

  const botMember = guild.members.me;
  if (!botMember) {
    return ['Bot not found in guild'];
  }

  // Check ManageRoles permission
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    missing.push('Manage Roles');
  }

  // Check ManageNicknames permission
  if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
    missing.push('Manage Nicknames');
  }

  // Check review channel permissions
  const reviewChannel = guild.channels.cache.get(reviewChannelId);
  if (reviewChannel?.isTextBased()) {
    const channelPerms = reviewChannel.permissionsFor(botMember);

    if (!channelPerms?.has(PermissionFlagsBits.SendMessages)) {
      missing.push('Send Messages (in review channel)');
    }
    if (!channelPerms?.has(PermissionFlagsBits.EmbedLinks)) {
      missing.push('Embed Links (in review channel)');
    }
    if (!channelPerms?.has(PermissionFlagsBits.ReadMessageHistory)) {
      missing.push('Read Message History (in review channel)');
    }
  }

  return missing;
}

/**
 * Validate role hierarchy for verification
 * Returns array of error messages (empty if validation passes)
 */
export function validateRoleHierarchy(
  guild: Guild,
  pendingRoleId: string | null,
  approvedRoleId: string | null
): string[] {
  const errors: string[] = [];

  const botMember = guild.members.me;
  if (!botMember) {
    return ['Bot not found in guild'];
  }

  const botHighestRole = botMember.roles.highest;

  // Validate pending role
  if (pendingRoleId) {
    const pendingRole = guild.roles.cache.get(pendingRoleId);
    if (pendingRole) {
      if (pendingRole.position >= botHighestRole.position) {
        errors.push(
          `Pending role "${pendingRole.name}" is above bot's highest role`
        );
      }
    } else {
      errors.push('Pending role not found');
    }
  }

  // Validate approved role
  if (approvedRoleId) {
    const approvedRole = guild.roles.cache.get(approvedRoleId);
    if (approvedRole) {
      if (approvedRole.position >= botHighestRole.position) {
        errors.push(
          `Approved role "${approvedRole.name}" is above bot's highest role`
        );
      }
    } else {
      errors.push('Approved role not found');
    }
  }

  return errors;
}
