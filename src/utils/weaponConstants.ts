import type { WeaponConfig, WeaponType, WeaponName } from '../types/index.js';

/**
 * Weapon configurations with emojis and display names
 */
export const WEAPON_CONFIGS: Record<WeaponName, WeaponConfig> = {
  // Swords
  strategic_sword: {
    name: 'strategic_sword',
    type: 'sword',
    emoji: '<:strategicsword:1485378651590496460>',
    displayNameEn: 'Strategic Sword',
    displayNameVi: 'Strategic Sword',
  },
  nameless_sword: {
    name: 'nameless_sword',
    type: 'sword',
    emoji: '<:namelesssword:1485378647903834262>',
    displayNameEn: 'Nameless Sword',
    displayNameVi: 'Nameless Sword',
  },

  // Spears
  stormbreaker_spear: {
    name: 'stormbreaker_spear',
    type: 'spear',
    emoji: '<:stormbreakerspear:1485378650412159157>',
    displayNameEn: 'Stormbreaker Spear',
    displayNameVi: 'Stormbreaker Spear',
  },
  heavenquaker_spear: {
    name: 'heavenquaker_spear',
    type: 'spear',
    emoji: '<:heavenquakerspear:1485378643818578160>',
    displayNameEn: 'Heavenquaker Spear',
    displayNameVi: 'Heavenquaker Spear',
  },
  nameless_spear: {
    name: 'nameless_spear',
    type: 'spear',
    emoji: '<:namelessspear:1485378647140601869>',
    displayNameEn: 'Nameless Spear',
    displayNameVi: 'Nameless Spear',
  },

  // Dual Blades / Twinblades
  infernal_twinblades: {
    name: 'infernal_twinblades',
    type: 'dual_blades',
    emoji: '<:infernaltwinblades:1485378644586135752>',
    displayNameEn: 'Infernal Twinblades',
    displayNameVi: 'Infernal Twinblades',
  },

  // Mo Dao
  mo_dao: {
    name: 'mo_dao',
    type: 'mo_dao',
    emoji: '<:thundercryblade:1485378652295401614>',
    displayNameEn: 'Mo Dao',
    displayNameVi: 'Mo Dao',
  },

  // Fans
  panacea_fan: {
    name: 'panacea_fan',
    type: 'fans',
    emoji: '<:panaceafan:1485378648637833407>',
    displayNameEn: 'Panacea Fan',
    displayNameVi: 'Panacea Fan',
  },
  inkwell_fan: {
    name: 'inkwell_fan',
    type: 'fans',
    emoji: '<:inkwellfan:1485378645471133798>',
    displayNameEn: 'Inkwell Fan',
    displayNameVi: 'Inkwell Fan',
  },

  // Umbrellas
  soulshade_umbrella: {
    name: 'soulshade_umbrella',
    type: 'umbrella',
    emoji: '<:soulshadeumbrella:1485378649455853588>',
    displayNameEn: 'Soulshade Umbrella',
    displayNameVi: 'Soulshade Umbrella',
  },
  vernal_umbrella: {
    name: 'vernal_umbrella',
    type: 'umbrella',
    emoji: '<:vernalumbrella:1485378653054566481>',
    displayNameEn: 'Vernal Umbrella',
    displayNameVi: 'Vernal Umbrella',
  },
  everspring_umbrella: {
    name: 'everspring_umbrella',
    type: 'umbrella',
    emoji: '☂️',
    displayNameEn: 'Everspring Umbrella',
    displayNameVi: 'Everspring Umbrella',
  },

  // Rope Darts
  mortal_rope_dart: {
    name: 'mortal_rope_dart',
    type: 'rope_dart',
    emoji: '<:mortalropedart:1485378646179840251>',
    displayNameEn: 'Mortal Rope Dart',
    displayNameVi: 'Mortal Rope Dart',
  },
  unfettered_rope_dart: {
    name: 'unfettered_rope_dart',
    type: 'rope_dart',
    emoji: '🪢',
    displayNameEn: 'Unfettered Rope Dart',
    displayNameVi: 'Unfettered Rope Dart',
  },
};

/**
 * Get weapon display name based on language
 */
export function getWeaponDisplayName(
  weaponName: WeaponName,
  language: 'en' | 'vi'
): string {
  const config = WEAPON_CONFIGS[weaponName];
  return language === 'vi' ? config.displayNameVi : config.displayNameEn;
}

/**
 * Get weapon with emoji
 */
export function getWeaponWithEmoji(
  weaponName: WeaponName,
  language: 'en' | 'vi'
): string {
  const config = WEAPON_CONFIGS[weaponName];
  const name = language === 'vi' ? config.displayNameVi : config.displayNameEn;
  return `${config.emoji} ${name}`;
}

/**
 * Validate weapon name
 */
export function isValidWeaponName(name: string): name is WeaponName {
  return [
    'strategic_sword',
    'nameless_sword',
    'stormbreaker_spear',
    'heavenquaker_spear',
    'nameless_spear',
    'infernal_twinblades',
    'mo_dao',
    'panacea_fan',
    'inkwell_fan',
    'soulshade_umbrella',
    'vernal_umbrella',
    'everspring_umbrella',
    'mortal_rope_dart',
    'unfettered_rope_dart',
  ].includes(name);
}

/**
 * Get all weapons grouped by type
 */
export function getWeaponsByType(): Record<WeaponType, WeaponConfig[]> {
  const grouped: Record<WeaponType, WeaponConfig[]> = {
    sword: [],
    spear: [],
    dual_blades: [],
    mo_dao: [],
    fans: [],
    umbrella: [],
    rope_dart: [],
  };

  Object.values(WEAPON_CONFIGS).forEach((config) => {
    grouped[config.type].push(config);
  });

  return grouped;
}
