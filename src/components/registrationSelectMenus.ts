import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { WeaponName } from '../types/index.js';
import { WEAPON_CONFIGS } from '../utils/weaponConstants.js';
import { getTranslations } from '../localization/index.js';

// Temporary storage for weapon selections (in-memory, per user per guild)
const weaponSelections = new Map<string, { primary?: WeaponName; secondary?: WeaponName }>();

/**
 * Get storage key for weapon selections
 */
function getStorageKey(guildId: string, userId: string): string {
  return `${guildId}_${userId}`;
}

/**
 * Handle weapon select menu interactions
 */
export async function handleWeaponSelectMenu(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const customId = interaction.customId;
  // Custom ID format: registration_{weaponSlot}_weapon_{language}
  const parts = customId.split('_');
  const weaponSlot = parts[1] as 'primary' | 'secondary';
  const language = parts[3] as 'en' | 'vi';
  const selectedWeapon = interaction.values[0] as WeaponName;

  if (!interaction.guildId) {
    return;
  }

  const key = getStorageKey(interaction.guildId, interaction.user.id);
  const selections = weaponSelections.get(key) || {};

  if (weaponSlot === 'primary') {
    selections.primary = selectedWeapon;
  } else {
    selections.secondary = selectedWeapon;
  }

  weaponSelections.set(key, selections);

  // Get translations
  const t = getTranslations(language as 'en' | 'vi');

  // Build status message
  let statusMessage = t.registration.selectWeapons || '🗡️ Please select your weapons:';
  statusMessage += '\n\n';

  if (selections.primary) {
    const primaryConfig = WEAPON_CONFIGS[selections.primary];
    const primaryName = language === 'vi' ? primaryConfig.displayNameVi : primaryConfig.displayNameEn;
    statusMessage += `✅ **${t.registration.modalPrimaryWeapon}:** ${primaryConfig.emoji} ${primaryName}\n`;
  } else {
    statusMessage += `⬜ **${t.registration.modalPrimaryWeapon}:** Not selected\n`;
  }

  if (selections.secondary) {
    const secondaryConfig = WEAPON_CONFIGS[selections.secondary];
    const secondaryName = language === 'vi' ? secondaryConfig.displayNameVi : secondaryConfig.displayNameEn;
    statusMessage += `✅ **${t.registration.modalSecondaryWeapon}:** ${secondaryConfig.emoji} ${secondaryName}`;
  } else {
    statusMessage += `⬜ **${t.registration.modalSecondaryWeapon}:** Not selected`;
  }

  // Keep existing select menu components
  const components: any[] = [...interaction.message.components];

  // Add submit button if both weapons are selected
  if (selections.primary && selections.secondary) {
    const submitButton = new ButtonBuilder()
      .setCustomId(`registration_submit_${language}`)
      .setLabel(language === 'vi' ? '✅ Tiếp tục' : '✅ Continue')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      submitButton
    );

    components.push(buttonRow);
  }

  // Update message to show current selections
  await interaction.update({
    content: statusMessage,
    components: components as any,
  });
}

/**
 * Handle registration submit button
 */
export async function handleRegistrationSubmitButton(
  interaction: ButtonInteraction
): Promise<void> {
  const customId = interaction.customId;
  // Custom ID format: registration_submit_{language}
  const parts = customId.split('_');
  const language = parts[parts.length - 1] as 'en' | 'vi';
  console.log(`[Registration Submit] Custom ID: ${customId}, Extracted language: ${language}`);

  if (!interaction.guildId) {
    return;
  }

  const key = getStorageKey(interaction.guildId, interaction.user.id);
  const selections = weaponSelections.get(key);

  if (!selections?.primary || !selections?.secondary) {
    await interaction.reply({
      content: '❌ Please select both weapons first.',
      ephemeral: true,
    });
    return;
  }

  // Show modal with selected weapons
  const { showRegistrationModalWithWeapons } = await import(
    '../commands/registration.js'
  );
  await showRegistrationModalWithWeapons(
    interaction,
    selections.primary,
    selections.secondary,
    language
  );

  // Clear selections after modal shown
  weaponSelections.delete(key);
}

/**
 * Export weapon selections storage for testing
 */
export { weaponSelections };
