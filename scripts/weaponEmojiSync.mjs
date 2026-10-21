/**
 * Pure helpers for the weapon emoji sync.
 *
 * Kept apart from the script itself so they can be tested without a token or
 * a network connection.
 */

/**
 * Discord emoji names allow letters, digits and underscores, 2-32 characters
 */
export function toEmojiName(weaponName) {
  const slug = weaponName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);

  return slug.length >= 2 ? slug : `wwm${slug}`;
}

/**
 * The key a weapon takes in WEAPON_CONFIGS
 */
export function toWeaponSlug(weaponName) {
  return weaponName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Guess a weapon type from its name, for a config entry we are creating.
 * Falls back to 'sword', which is the game's catch-all for blades.
 */
export function guessWeaponType(weaponName) {
  const name = weaponName.toLowerCase();

  if (name.includes('spear')) return 'spear';
  if (name.includes('twinblade') || name.includes('dual')) return 'dual_blades';
  if (name.includes('fan')) return 'fans';
  if (name.includes('umbrella')) return 'umbrella';
  if (name.includes('rope dart')) return 'rope_dart';
  if (name.includes('gauntlet')) return 'gauntlets';
  if (name.includes('drum')) return 'drum';
  if (name.includes('thundercry')) return 'thundercry_blade';

  return 'sword';
}

/**
 * Replace the emoji of an existing weapon entry in weaponConstants.ts.
 * Returns the source unchanged when the weapon is not present.
 */
export function applyEmojiToSource(source, weaponSlug, emoji) {
  const pattern = new RegExp(
    `(  ${weaponSlug}: \\{[\\s\\S]*?emoji: ')([^']*)(')`,
    'm'
  );

  if (!pattern.test(source)) {
    return source;
  }

  return source.replace(pattern, `$1${emoji}$3`);
}

/**
 * Append a brand-new weapon to WEAPON_CONFIGS
 */
export function appendWeaponToSource(source, weapon) {
  const entry = [
    ``,
    `  // Added by scripts/sync-weapon-emojis.mjs`,
    `  ${weapon.slug}: {`,
    `    name: '${weapon.slug}',`,
    `    type: '${weapon.type}',`,
    `    emoji: '${weapon.emoji}',`,
    `    displayNameEn: '${weapon.displayName}',`,
    `    displayNameVi: '${weapon.displayName}',`,
    `    officialId: ${weapon.officialId},`,
    `    iconUrl:`,
    `      '${weapon.iconUrl}',`,
    `  },`,
    `};`,
  ].join('\n');

  // Close of the WEAPON_CONFIGS object literal
  const marker = '\n};\n';
  const index = source.indexOf(marker);

  if (index === -1) {
    throw new Error('could not find the end of WEAPON_CONFIGS');
  }

  return source.slice(0, index) + '\n' + entry + source.slice(index + marker.length);
}

/**
 * Add a new member to the WeaponName union in types/index.ts
 */
export function addWeaponNameToUnion(source, weaponSlug, comment) {
  if (source.includes(`| '${weaponSlug}'`)) {
    return source;
  }

  // The union's last member is whichever weapon was added most recently
  const lastMember = /(export type WeaponName =[\s\S]*?\| '[a-z0-9_]+')(;)/;

  if (!lastMember.test(source)) {
    throw new Error('could not find the end of the WeaponName union');
  }

  return source.replace(lastMember, `$1\n  // ${comment}\n  | '${weaponSlug}'$2`);
}

/**
 * Which weapons need work: ones we do not know about at all, and ones whose
 * emoji is still a stand-in unicode character rather than a custom emoji.
 */
export function planEmojiWork(officialWeapons, configs) {
  const bySlug = new Map(Object.entries(configs));
  const byDisplayName = new Map(
    Object.values(configs).map((config) => [config.displayNameEn, config])
  );

  const work = [];

  for (const weapon of officialWeapons) {
    if (!weapon.iconUrl) {
      continue;
    }

    const existing = byDisplayName.get(weapon.name);

    if (!existing) {
      work.push({ kind: 'new', weapon, slug: toWeaponSlug(weapon.name) });
      continue;
    }

    if (!existing.emoji.startsWith('<:')) {
      work.push({ kind: 'emoji', weapon, slug: existing.name });
    }
  }

  // Deterministic order keeps the diff readable
  work.sort((a, b) => a.slug.localeCompare(b.slug));

  return { work, bySlug };
}
