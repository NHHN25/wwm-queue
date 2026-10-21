import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { WEAPON_CONFIGS } from './weaponConstants.js';

const ICON_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'weapons');

interface AppEmoji {
  name: string | null;
  toString(): string;
}

// The slice of discord.js's ApplicationEmojiManager this needs
export interface AppEmojiManager {
  fetch(): Promise<{ values(): Iterable<AppEmoji> }>;
  create(options: { attachment: Buffer; name: string }): Promise<AppEmoji>;
}

/**
 * Give every weapon still on a placeholder unicode emoji its real icon, using the
 * bot's own token: bundled icons in assets/weapons are uploaded as application
 * emojis (reused if already uploaded) and swapped into WEAPON_CONFIGS in memory.
 * Returns the weapons that were upgraded.
 */
export async function ensureWeaponEmojis(
  emojis: AppEmojiManager,
  iconDir: string = ICON_DIR
): Promise<string[]> {
  const pending = Object.values(WEAPON_CONFIGS)
    .filter((config) => !config.emoji.startsWith('<'))
    .map((config) => ({ config, iconPath: join(iconDir, `${config.name.replace(/_/g, '-')}.png`) }))
    .filter(({ iconPath }) => existsSync(iconPath));

  if (pending.length === 0) {
    return [];
  }

  const existing = new Map<string | null, AppEmoji>();
  for (const emoji of (await emojis.fetch()).values()) {
    existing.set(emoji.name, emoji);
  }

  const upgraded: string[] = [];

  for (const { config, iconPath } of pending) {
    const emojiName = config.name.replace(/_/g, '');

    try {
      const emoji =
        existing.get(emojiName) ??
        (await emojis.create({ attachment: readFileSync(iconPath), name: emojiName }));

      config.emoji = emoji.toString();
      upgraded.push(config.name);
      console.log(`[Weapon Emojis] ${config.displayNameEn} -> ${config.emoji}`);
    } catch (error) {
      console.error(`[Weapon Emojis] Could not upload ${config.displayNameEn}:`, error);
    }
  }

  return upgraded;
}
