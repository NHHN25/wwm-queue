import { ModalSubmitInteraction } from 'discord.js';
import { updatePlayerStats } from '../database/database.js';
import { getGuildTranslations } from '../localization/index.js';

/**
 * Handle stats update modal submission
 */
export async function handleUpdateModalSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  try {
    const gearScoreStr = interaction.fields
      .getTextInputValue('gear_score_update')
      .trim();
    const arenaRank = interaction.fields
      .getTextInputValue('arena_rank_update')
      .trim();

    // Parse gear score - support both formats:
    // - Goose format: "1.82" or "0.68" -> multiply by 10000 -> store as 18200 or 6800
    // - Whole number: "18200" or "6800" -> store as-is
    let gearScore: number;
    const gearScoreFloat = parseFloat(gearScoreStr);

    if (isNaN(gearScoreFloat) || gearScoreFloat < 0) {
      await interaction.reply({
        content: t.registration.errorInvalidGearScore,
        ephemeral: true,
      });
      return;
    }

    // If input contains a decimal point or is less than 100, treat as goose format (e.g., 1.82, 0.68)
    // Otherwise treat as whole number (e.g., 18200, 6800)
    if (gearScoreStr.includes('.') || gearScoreFloat < 100) {
      gearScore = Math.round(gearScoreFloat * 10000);
    } else {
      gearScore = Math.round(gearScoreFloat);
    }

    const success = updatePlayerStats(
      interaction.guildId,
      interaction.user.id,
      gearScore,
      arenaRank
    );

    if (!success) {
      await interaction.reply({
        content: '❌ Failed to update stats. Make sure you are registered first.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: t.registration.updateSuccess,
      ephemeral: true,
    });
  } catch (error) {
    console.error('[Update Modal] Error handling submission:', error);
    await interaction.reply({
      content:
        '❌ An error occurred while updating your stats.',
      ephemeral: true,
    });
  }
}
