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
    officialId: 10101,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa0d255bcd837870a3aMHIsXkT05.png',
  },
  nameless_sword: {
    name: 'nameless_sword',
    type: 'sword',
    emoji: '<:namelesssword:1485378647903834262>',
    displayNameEn: 'Nameless Sword',
    displayNameVi: 'Nameless Sword',
    officialId: 10102,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa0b4118b829cb9897bxQP55Mx05.png',
  },

  // Spears
  stormbreaker_spear: {
    name: 'stormbreaker_spear',
    type: 'spear',
    emoji: '<:stormbreakerspear:1485378650412159157>',
    displayNameEn: 'Stormbreaker Spear',
    displayNameVi: 'Stormbreaker Spear',
    officialId: 20103,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361f9045985a8447c7924iziG1iSk05.png',
  },
  heavenquaker_spear: {
    name: 'heavenquaker_spear',
    type: 'spear',
    emoji: '<:heavenquakerspear:1485378643818578160>',
    displayNameEn: 'Heavenquaker Spear',
    displayNameVi: 'Heavenquaker Spear',
    officialId: 10201,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361f9411028bc4c807bfbFd4qfv0i05.png',
  },
  nameless_spear: {
    name: 'nameless_spear',
    type: 'spear',
    emoji: '<:namelessspear:1485378647140601869>',
    displayNameEn: 'Nameless Spear',
    displayNameVi: 'Nameless Spear',
    officialId: 10202,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa50023072c09fddb3mYcX2v9x05.png',
  },

  // Dual Blades / Twinblades
  infernal_twinblades: {
    name: 'infernal_twinblades',
    type: 'dual_blades',
    emoji: '<:infernaltwinblades:1485378644586135752>',
    displayNameEn: 'Infernal Twinblades',
    displayNameVi: 'Infernal Twinblades',
    officialId: 20501,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa56bd72932802d4ccyjpEwat505.png',
  },

  // Thundercry Blade
  thundercry_blade: {
    name: 'thundercry_blade',
    type: 'thundercry_blade',
    emoji: '<:thundercryblade:1485378652295401614>',
    displayNameEn: 'Thundercry Blade',
    displayNameVi: 'Thundercry Blade',
    officialId: 20401,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361f99563b8facc30cf6ehklvbGJK05.png',
  },

  // Fans
  panacea_fan: {
    name: 'panacea_fan',
    type: 'fans',
    emoji: '<:panaceafan:1485378648637833407>',
    displayNameEn: 'Panacea Fan',
    displayNameVi: 'Panacea Fan',
    officialId: 10301,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361f90faf4af485d190ac43YHxPWh05.png',
  },
  inkwell_fan: {
    name: 'inkwell_fan',
    type: 'fans',
    emoji: '<:inkwellfan:1485378645471133798>',
    displayNameEn: 'Inkwell Fan',
    displayNameVi: 'Inkwell Fan',
    officialId: 10302,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa97229b799b104e11dq8JNGxv05.png',
  },

  // Umbrellas
  soulshade_umbrella: {
    name: 'soulshade_umbrella',
    type: 'umbrella',
    emoji: '<:soulshadeumbrella:1485378649455853588>',
    displayNameEn: 'Soulshade Umbrella',
    displayNameVi: 'Soulshade Umbrella',
    officialId: 20602,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/67f49ad895b56d4ae6020d07B0KGD9oW06.png',
  },
  vernal_umbrella: {
    name: 'vernal_umbrella',
    type: 'umbrella',
    emoji: '<:vernalumbrella:1485378653054566481>',
    displayNameEn: 'Vernal Umbrella',
    displayNameVi: 'Vernal Umbrella',
    officialId: 20601,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361f9bdd01237a679ed4cufrGeAwO05.png',
  },
  everspring_umbrella: {
    name: 'everspring_umbrella',
    type: 'umbrella',
    emoji: '<:everspringumbrella:1489150298755960832>',
    displayNameEn: 'Everspring Umbrella',
    displayNameVi: 'Everspring Umbrella',
    officialId: 20603,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/67eb622c8640a97e4d7d833dwizwhR4c06.png',
  },

  // Rope Darts
  mortal_rope_dart: {
    name: 'mortal_rope_dart',
    type: 'rope_dart',
    emoji: '<:mortalropedart:1485378646179840251>',
    displayNameEn: 'Mortal Rope Dart',
    displayNameVi: 'Mortal Rope Dart',
    officialId: 20701,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/673361fa5e97ad80a09e42eeiOOc9Ofd05.png',
  },
  unfettered_rope_dart: {
    name: 'unfettered_rope_dart',
    type: 'rope_dart',
    emoji: '<:unfetteredropedart:1489150256951201823>',
    displayNameEn: 'Unfettered Rope Dart',
    displayNameVi: 'Unfettered Rope Dart',
    officialId: 20702,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/688225667d068e9b796ac808u9vfrGDj06.png',
  },
  skygrasp_rope_dart: {
    name: 'skygrasp_rope_dart',
    type: 'rope_dart',
    emoji: '🪢',
    displayNameEn: 'Skygrasp Rope Dart',
    displayNameVi: 'Skygrasp Rope Dart',
  },

  // Blades
  snowparting_blade: {
    name: 'snowparting_blade',
    type: 'sword',
    emoji: '<:snowpartingblade:1489268359978680420>',
    displayNameEn: 'Snowparting Blade',
    displayNameVi: 'Snowparting Blade',
    officialId: 20801,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/688225667d068e9b796ac808u9vfrGDj06.png',
  },
  phalanxbane_blade: {
    name: 'phalanxbane_blade',
    type: 'sword',
    emoji: '<:phalanxbaneblade:1489268358607278226>',
    displayNameEn: 'Phalanxbane Blade',
    displayNameVi: 'Phalanxbane Blade',
    officialId: 20402,
    iconUrl:
      'https://www.wherewindsmeetgame.com/pc/qt/20251203102905/data/kongfu/images/6889d622854eae874565b6e3Gcq3FafN06.png',
  },

  // Gauntlets
  heavenwill_gauntlets: {
    name: 'heavenwill_gauntlets',
    type: 'gauntlets',
    emoji: '🥊',
    displayNameEn: 'Heavenwill Gauntlets',
    displayNameVi: 'Heavenwill Gauntlets',
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
  if (!config) return `❓ ${weaponName}`;
  const name = language === 'vi' ? config.displayNameVi : config.displayNameEn;
  return `${config.emoji} ${name}`;
}

/**
 * Validate weapon name
 */
export function isValidWeaponName(name: string): name is WeaponName {
  return name in WEAPON_CONFIGS;
}

/**
 * Get all weapons grouped by type
 */
export function getWeaponsByType(): Record<WeaponType, WeaponConfig[]> {
  const grouped: Record<WeaponType, WeaponConfig[]> = {
    sword: [],
    spear: [],
    dual_blades: [],
    thundercry_blade: [],
    fans: [],
    umbrella: [],
    rope_dart: [],
    gauntlets: [],
  };

  Object.values(WEAPON_CONFIGS).forEach((config) => {
    grouped[config.type].push(config);
  });

  return grouped;
}
