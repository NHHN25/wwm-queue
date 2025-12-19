import { EmbedBuilder, User } from 'discord.js';
import type { PlayerRegistrationRow } from '../types/index.js';
import {
  getGuildTranslations,
  getGuildLanguage,
} from '../localization/index.js';
import { getWeaponWithEmoji } from './weaponConstants.js';

/**
 * Create pending registration embed (orange card for admin review)
 */
export function createPendingRegistrationEmbed(
  registration: PlayerRegistrationRow,
  user: User,
  guildId: string
): EmbedBuilder {
  const t = getGuildTranslations(guildId);
  const language = getGuildLanguage(guildId) || 'en';

  const primaryWeapon = getWeaponWithEmoji(
    registration.primary_weapon,
    language
  );
  const secondaryWeapon = getWeaponWithEmoji(
    registration.secondary_weapon,
    language
  );

  // Format gear score with thousands separator
  const formattedGearScore = (registration.gear_score / 1000).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(t.verification.pendingCardTitle)
    .setColor(0xffa500) // Orange
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp(new Date(registration.created_at));

  embed.addFields(
    {
      name: t.registration.profileFieldIngameName,
      value: `\`${registration.ingame_name}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldUid,
      value: `\`${registration.ingame_uid}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldGearScore,
      value: `**${formattedGearScore}**`,
      inline: true,
    },
    {
      name: t.registration.profileFieldArenaRank,
      value: registration.arena_rank || 'N/A',
      inline: true,
    },
    {
      name: t.registration.profileFieldWeapons,
      value: `**${t.registration.profileFieldPrimaryWeapon}:** ${primaryWeapon}\n**${t.registration.profileFieldSecondaryWeapon}:** ${secondaryWeapon}`,
      inline: false,
    }
  );

  embed.setFooter({
    text: `Discord: @${user.username} • ${t.verification.pendingCardFooter}`,
    iconURL: user.displayAvatarURL({ size: 64 }),
  });

  return embed;
}

/**
 * Create approved registration embed (green card)
 */
export function createApprovedRegistrationEmbed(
  registration: PlayerRegistrationRow,
  user: User,
  approverUsername: string,
  guildId: string
): EmbedBuilder {
  const t = getGuildTranslations(guildId);
  const language = getGuildLanguage(guildId) || 'en';

  const primaryWeapon = getWeaponWithEmoji(
    registration.primary_weapon,
    language
  );
  const secondaryWeapon = getWeaponWithEmoji(
    registration.secondary_weapon,
    language
  );

  // Format gear score with thousands separator
  const formattedGearScore = (registration.gear_score / 1000).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(t.verification.approvedCardTitle)
    .setColor(0x00ff00) // Green
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp(
      registration.approved_at ? new Date(registration.approved_at) : new Date()
    );

  embed.addFields(
    {
      name: t.registration.profileFieldIngameName,
      value: `\`${registration.ingame_name}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldUid,
      value: `\`${registration.ingame_uid}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldGearScore,
      value: `**${formattedGearScore}**`,
      inline: true,
    },
    {
      name: t.registration.profileFieldArenaRank,
      value: registration.arena_rank || 'N/A',
      inline: true,
    },
    {
      name: t.registration.profileFieldWeapons,
      value: `**${t.registration.profileFieldPrimaryWeapon}:** ${primaryWeapon}\n**${t.registration.profileFieldSecondaryWeapon}:** ${secondaryWeapon}`,
      inline: false,
    }
  );

  embed.setFooter({
    text: `Discord: @${user.username} • ${t.verification.approvedBy(approverUsername)}`,
    iconURL: user.displayAvatarURL({ size: 64 }),
  });

  return embed;
}

/**
 * Create rejected registration embed (red card)
 */
export function createRejectedRegistrationEmbed(
  registration: PlayerRegistrationRow,
  user: User,
  rejecterUsername: string,
  guildId: string
): EmbedBuilder {
  const t = getGuildTranslations(guildId);
  const language = getGuildLanguage(guildId) || 'en';

  const primaryWeapon = getWeaponWithEmoji(
    registration.primary_weapon,
    language
  );
  const secondaryWeapon = getWeaponWithEmoji(
    registration.secondary_weapon,
    language
  );

  // Format gear score with thousands separator
  const formattedGearScore = (registration.gear_score / 1000).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(t.verification.rejectedCardTitle)
    .setColor(0xff0000) // Red
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp(
      registration.approved_at ? new Date(registration.approved_at) : new Date()
    );

  embed.addFields(
    {
      name: t.registration.profileFieldIngameName,
      value: `\`${registration.ingame_name}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldUid,
      value: `\`${registration.ingame_uid}\``,
      inline: true,
    },
    {
      name: t.registration.profileFieldGearScore,
      value: `**${formattedGearScore}**`,
      inline: true,
    },
    {
      name: t.registration.profileFieldArenaRank,
      value: registration.arena_rank || 'N/A',
      inline: true,
    },
    {
      name: t.registration.profileFieldWeapons,
      value: `**${t.registration.profileFieldPrimaryWeapon}:** ${primaryWeapon}\n**${t.registration.profileFieldSecondaryWeapon}:** ${secondaryWeapon}`,
      inline: false,
    }
  );

  embed.setFooter({
    text: `Discord: @${user.username} • ${t.verification.rejectedBy(rejecterUsername)}`,
    iconURL: user.displayAvatarURL({ size: 64 }),
  });

  return embed;
}
