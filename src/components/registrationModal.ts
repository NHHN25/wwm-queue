import { ModalSubmitInteraction } from 'discord.js';
import {
  upsertPlayerRegistration,
  isPlayerRegistered,
} from '../database/database.js';
import { getTranslations } from '../localization/index.js';
import { isValidWeaponName } from '../utils/weaponConstants.js';

/**
 * Handle registration modal submission
 */
export async function handleRegistrationModalSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true,
    });
    return;
  }

  // Parse weapons from custom ID (format: registration_modal|{primary}|{secondary}|{language})
  const customIdParts = interaction.customId.split('|');
  const primaryWeapon = customIdParts[1];
  const secondaryWeapon = customIdParts[2];
  const language = customIdParts[3] as 'en' | 'vi';

  if (
    !isValidWeaponName(primaryWeapon) ||
    !isValidWeaponName(secondaryWeapon)
  ) {
    await interaction.reply({
      content: '❌ Invalid weapon selection. Please try again.',
      ephemeral: true,
    });
    return;
  }

  const t = getTranslations(language);

  try {
    const ingameName = interaction.fields
      .getTextInputValue('ingame_name')
      .trim();
    const ingameUid = interaction.fields
      .getTextInputValue('ingame_uid')
      .trim();
    const gearScoreStr = interaction.fields
      .getTextInputValue('gear_score')
      .trim();
    const arenaRank = interaction.fields
      .getTextInputValue('arena_rank')
      .trim();

    // Parse gear score - support both formats:
    // - Decimal format: "1.628" (in thousands) -> store as 1628
    // - Whole number: "16280" -> store as 16280
    let gearScore: number;
    const gearScoreFloat = parseFloat(gearScoreStr);

    if (isNaN(gearScoreFloat) || gearScoreFloat < 0) {
      await interaction.reply({
        content: t.registration.errorInvalidGearScore,
        ephemeral: true,
      });
      return;
    }

    // If input contains a decimal point or is less than 100, treat as thousands (e.g., 1.628 or 16.28)
    // Otherwise treat as whole number (e.g., 16280)
    if (gearScoreStr.includes('.') || gearScoreFloat < 100) {
      gearScore = Math.round(gearScoreFloat * 1000);
    } else {
      gearScore = Math.round(gearScoreFloat);
    }

    const wasRegistered = isPlayerRegistered(
      interaction.guildId,
      interaction.user.id
    );

    const success = upsertPlayerRegistration(
      interaction.guildId,
      interaction.user.id,
      ingameName,
      ingameUid,
      gearScore,
      arenaRank,
      primaryWeapon,
      secondaryWeapon
    );

    if (!success) {
      await interaction.reply({
        content: '❌ Failed to save registration. Please try again.',
        ephemeral: true,
      });
      return;
    }

    // Check if verification is enabled and user needs approval
    const {
      getVerificationSettings,
      getPlayerRegistration,
    } = await import('../database/database.js');
    const { postPendingRegistrationForReview } = await import(
      '../utils/verificationHelpers.js'
    );

    const verificationSettings = getVerificationSettings(interaction.guildId);
    const registration = getPlayerRegistration(
      interaction.guildId,
      interaction.user.id
    );

    // Fetch member to check their roles
    const member = await interaction.guild!.members.fetch(
      interaction.user.id
    );

    // User needs verification if:
    // 1. Verification is enabled
    // 2. They have the pending role (configured in verification settings)
    // 3. They're not already approved
    const hasPendingRole =
      verificationSettings?.pending_role_id &&
      member.roles.cache.has(verificationSettings.pending_role_id);

    const needsVerification =
      verificationSettings?.enabled &&
      hasPendingRole &&
      registration?.approval_status !== 'approved';

    if (needsVerification && registration) {
      // Post to review channel for approval
      const reviewMessageId = await postPendingRegistrationForReview(
        interaction.guild!,
        member,
        registration,
        verificationSettings
      );

      if (reviewMessageId) {
        await interaction.reply({
          content: t.verification.pendingReview,
          ephemeral: true,
        });
      } else {
        // Failed to post to review channel, complete registration immediately
        await interaction.reply({
          content: wasRegistered
            ? t.registration.registrationUpdated
            : t.registration.registrationSuccess,
          ephemeral: true,
        });
      }
    } else {
      // No verification needed (no pending role or already approved) - complete immediately
      const message = wasRegistered
        ? t.registration.registrationUpdated
        : t.registration.registrationSuccess;

      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    }

    // Delete the weapon selection message and show profile
    try {
      // Delete the original weapon selection message (if it still exists)
      if (interaction.message && interaction.message.deletable) {
        try {
          await interaction.message.delete();
        } catch (deleteError: any) {
          // Ignore "Unknown Message" errors (code 10008) - message was already deleted
          if (deleteError?.code !== 10008) {
            console.error('[Registration Modal] Error deleting message:', deleteError);
          }
        }
      }

      // Send profile info to the channel
      const { createProfileEmbed } = await import(
        '../utils/registrationEmbeds.js'
      );
      const profileEmbed = createProfileEmbed(
        registration!,
        interaction.user,
        interaction.guildId
      );

      await interaction.followUp({
        embeds: [profileEmbed],
        ephemeral: false, // Make it public so everyone can see
      });
    } catch (error) {
      console.error(
        '[Registration Modal] Error in post-registration flow:',
        error
      );
      // Don't fail the whole registration if cleanup fails
    }
  } catch (error) {
    console.error('[Registration Modal] Error handling submission:', error);

    try {
      await interaction.reply({
        content:
          '❌ An error occurred while processing your registration.',
        ephemeral: true,
      });
    } catch (replyError) {
      // If we can't reply, the interaction may have already been responded to
      console.error('[Registration Modal] Failed to send error message:', replyError);
    }
  }
}
