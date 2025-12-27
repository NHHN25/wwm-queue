import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { getGuildTranslations, getTranslations, getGuildLanguage } from '../localization/index.js';
import {
  getRegistrationChannel,
  setRegistrationChannel,
  getPlayerRegistration,
} from '../database/database.js';
import { formatGearScoreAsGoose } from '../utils/embeds.js';
import { createProfileEmbed } from '../utils/registrationEmbeds.js';
import { WEAPON_CONFIGS } from '../utils/weaponConstants.js';
import type { WeaponName } from '../types/index.js';

/**
 * Build registration-related slash commands
 */
export function buildRegistrationCommands() {
  const registerCommand = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your in-game profile')
    .setDMPermission(false);

  const baodanhCommand = new SlashCommandBuilder()
    .setName('baodanh')
    .setDescription('Đăng ký hồ sơ người chơi')
    .setDMPermission(false);

  const infoCommand = new SlashCommandBuilder()
    .setName('info')
    .setDescription("View a player's profile")
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('The player to view (leave empty for yourself)')
        .setRequired(false)
    )
    .setDMPermission(false);

  const setupRegistrationCommand = new SlashCommandBuilder()
    .setName('setup-registration')
    .setDescription('Set the registration channel')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel where players can register')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

  const capnhatCommand = new SlashCommandBuilder()
    .setName('capnhat')
    .setDescription('Cập nhật lực chiến và hạng đấu trường')
    .setDMPermission(false);

  return [
    registerCommand,
    baodanhCommand,
    infoCommand,
    setupRegistrationCommand,
    capnhatCommand,
  ];
}

/**
 * Handle registration command interactions
 */
export async function handleRegistrationCommand(
  interaction: CommandInteraction
): Promise<void> {
  const commandName = interaction.commandName;

  try {
    if (commandName === 'register' || commandName === 'baodanh') {
      await handleRegisterCommand(interaction);
    } else if (commandName === 'info') {
      await handleInfoCommand(interaction);
    } else if (commandName === 'setup-registration') {
      await handleSetupRegistrationCommand(interaction);
    } else if (commandName === 'capnhat') {
      await handleCapnhatCommand(interaction);
    }
  } catch (error) {
    console.error(`[Registration] Error handling /${commandName}:`, error);

    const reply = {
      content:
        '❌ An error occurred. Please try again or contact an admin.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

/**
 * Handle /register and /baodanh commands
 * Step 1: Show weapon selection menus
 */
async function handleRegisterCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);
  const registrationChannelId = getRegistrationChannel(interaction.guildId);

  if (!registrationChannelId) {
    await interaction.reply({
      content: t.registration.errorNoChannel,
      ephemeral: true,
    });
    return;
  }

  if (interaction.channelId !== registrationChannelId) {
    await interaction.reply({
      content: t.registration.errorWrongChannel(
        `<#${registrationChannelId}>`
      ),
      ephemeral: true,
    });
    return;
  }

  // Determine language: /baodanh always uses Vietnamese, /register uses guild language
  const language: 'en' | 'vi' = interaction.commandName === 'baodanh'
    ? 'vi'
    : getGuildLanguage(interaction.guildId);

  await showWeaponSelection(interaction, language);
}

/**
 * Step 1: Show weapon selection dropdowns
 */
async function showWeaponSelection(
  interaction: CommandInteraction,
  language: 'en' | 'vi'
): Promise<void> {
  const t = getTranslations(language);
  const existingReg = getPlayerRegistration(
    interaction.guildId!,
    interaction.user.id
  );

  // Build weapon options
  const weaponOptions = Object.values(WEAPON_CONFIGS).map((weapon) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(
        `${weapon.emoji} ${language === 'vi' ? weapon.displayNameVi : weapon.displayNameEn}`
      )
      .setValue(weapon.name)
  );

  // Primary weapon select menu
  const primaryWeaponSelect = new StringSelectMenuBuilder()
    .setCustomId(`registration_primary_weapon_${language}`)
    .setPlaceholder(t.registration.modalPrimaryWeapon)
    .addOptions(weaponOptions);

  if (existingReg) {
    primaryWeaponSelect.setPlaceholder(
      `${t.registration.modalPrimaryWeapon} (Current: ${WEAPON_CONFIGS[existingReg.primary_weapon].emoji} ${language === 'vi' ? WEAPON_CONFIGS[existingReg.primary_weapon].displayNameVi : WEAPON_CONFIGS[existingReg.primary_weapon].displayNameEn})`
    );
  }

  // Secondary weapon select menu
  const secondaryWeaponSelect = new StringSelectMenuBuilder()
    .setCustomId(`registration_secondary_weapon_${language}`)
    .setPlaceholder(t.registration.modalSecondaryWeapon)
    .addOptions(weaponOptions);

  if (existingReg) {
    secondaryWeaponSelect.setPlaceholder(
      `${t.registration.modalSecondaryWeapon} (Current: ${WEAPON_CONFIGS[existingReg.secondary_weapon].emoji} ${language === 'vi' ? WEAPON_CONFIGS[existingReg.secondary_weapon].displayNameVi : WEAPON_CONFIGS[existingReg.secondary_weapon].displayNameEn})`
    );
  }

  const row1 =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      primaryWeaponSelect
    );
  const row2 =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      secondaryWeaponSelect
    );

  await interaction.reply({
    content: t.registration.selectWeapons || '🗡️ Please select your weapons:',
    components: [row1, row2],
    ephemeral: true,
  });
}

/**
 * Step 2: Show registration modal after weapon selection (without weapon fields)
 * Exported for use by select menu handler
 */
export async function showRegistrationModalWithWeapons(
  interaction: any,
  primaryWeapon: WeaponName,
  secondaryWeapon: WeaponName,
  language: 'en' | 'vi'
): Promise<void> {
  const t = getTranslations(language);
  const existingReg = getPlayerRegistration(
    interaction.guildId!,
    interaction.user.id
  );

  const modal = new ModalBuilder()
    .setCustomId(`registration_modal|${primaryWeapon}|${secondaryWeapon}|${language}`)
    .setTitle(t.registration.modalTitle);

  const ingameNameInput = new TextInputBuilder()
    .setCustomId('ingame_name')
    .setLabel(t.registration.modalIngameName)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderIngameName)
    .setRequired(true)
    .setMaxLength(50);
  if (existingReg) ingameNameInput.setValue(existingReg.ingame_name);

  const ingameUidInput = new TextInputBuilder()
    .setCustomId('ingame_uid')
    .setLabel(t.registration.modalIngameUid)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderIngameUid)
    .setRequired(true)
    .setMaxLength(50);
  if (existingReg) ingameUidInput.setValue(existingReg.ingame_uid);

  const gearScoreInput = new TextInputBuilder()
    .setCustomId('gear_score')
    .setLabel(t.registration.modalGearScore)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderGearScore)
    .setRequired(true)
    .setMaxLength(10);
  if (existingReg)
    gearScoreInput.setValue(existingReg.gear_score.toString());

  const arenaRankInput = new TextInputBuilder()
    .setCustomId('arena_rank')
    .setLabel(t.registration.modalArenaRank)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderArenaRank)
    .setRequired(false)
    .setMaxLength(50);
  if (existingReg && existingReg.arena_rank)
    arenaRankInput.setValue(existingReg.arena_rank);

  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      ingameNameInput
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      ingameUidInput
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      gearScoreInput
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      arenaRankInput
    )
  );

  await interaction.showModal(modal);
}

/**
 * Handle /info command
 */
async function handleInfoCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  // Type assertion since we know this is a ChatInputCommandInteraction
  const targetUser =
    (interaction as any).options?.getUser('user') ?? interaction.user;
  const registration = getPlayerRegistration(
    interaction.guildId,
    targetUser.id
  );

  if (!registration) {
    await interaction.reply({
      content: t.registration.profileNotFound,
      ephemeral: true,
    });
    return;
  }

  const profileEmbed = createProfileEmbed(
    registration,
    targetUser,
    interaction.guildId
  );
  await interaction.reply({ embeds: [profileEmbed] });
}

/**
 * Handle /setup-registration command
 */
async function handleSetupRegistrationCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  // Type assertion since we know this is a ChatInputCommandInteraction
  const targetChannel = (interaction as any).options.getChannel(
    'channel',
    true
  );

  if (!targetChannel.isTextBased()) {
    await interaction.reply({
      content: '❌ Invalid channel. Please select a text channel.',
      ephemeral: true,
    });
    return;
  }

  const botMember = await interaction.guild.members.fetchMe();
  const permissions = targetChannel.permissionsFor(botMember);

  if (
    !permissions?.has(PermissionsBitField.Flags.SendMessages) ||
    !permissions?.has(PermissionsBitField.Flags.ViewChannel)
  ) {
    await interaction.reply({
      content: `❌ I need Send Messages and View Channel permissions in ${targetChannel}.`,
      ephemeral: true,
    });
    return;
  }

  const success = setRegistrationChannel(
    interaction.guildId,
    targetChannel.id
  );

  if (!success) {
    await interaction.reply({
      content: '❌ Failed to set registration channel.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: t.registration.channelSetSuccess(`<#${targetChannel.id}>`),
    ephemeral: true,
  });
}

/**
 * Handle /capnhat command
 * Opens modal with current gear score and arena rank
 */
async function handleCapnhatCommand(
  interaction: CommandInteraction
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  const t = getGuildTranslations(interaction.guildId);

  // Check if user is registered
  const existingReg = getPlayerRegistration(interaction.guildId, interaction.user.id);

  if (!existingReg) {
    await interaction.reply({
      content: '❌ You need to register first using `/baodanh` or `/register`.',
      ephemeral: true,
    });
    return;
  }

  // Create update modal with pre-filled values
  const modal = new ModalBuilder()
    .setCustomId('capnhat_modal')
    .setTitle(t.registration.updateModalTitle);

  // Format gear score for display (Goose format without emoji for input field)
  const formattedGearScore = formatGearScoreAsGoose(existingReg.gear_score)
    .replace('🦆', ''); // Remove emoji for input field

  const gearScoreInput = new TextInputBuilder()
    .setCustomId('gear_score_update')
    .setLabel(t.registration.modalGearScore)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderGearScore)
    .setRequired(true)
    .setMaxLength(10)
    .setValue(formattedGearScore);

  const arenaRankInput = new TextInputBuilder()
    .setCustomId('arena_rank_update')
    .setLabel(t.registration.modalArenaRank)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t.registration.placeholderArenaRank)
    .setRequired(false)
    .setMaxLength(50);

  if (existingReg.arena_rank) {
    arenaRankInput.setValue(existingReg.arena_rank);
  }

  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      gearScoreInput
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      arenaRankInput
    )
  );

  await interaction.showModal(modal);
}
