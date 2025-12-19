import { EmbedBuilder, User } from 'discord.js';
import type { PlayerRegistrationRow } from '../types/index.js';
import {
  getGuildTranslations,
  getGuildLanguage,
} from '../localization/index.js';
import { getWeaponWithEmoji } from './weaponConstants.js';

/**
 * Create player profile embed (namecard style)
 */
export function createProfileEmbed(
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
  // Format gear score with thousands separator (e.g., 16287952 -> 16.288 or 16,288)
  const formattedGearScore = (registration.gear_score / 1000).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });

  const embed = new EmbedBuilder()
    .setTitle(`${t.registration.profileTitle}`)
    .setColor(0x5865f2)
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
    text: `Discord: @${user.username} • ${t.registration.profileFieldRegistered}`,
    iconURL: user.displayAvatarURL({ size: 64 }),
  });

  return embed;
}
