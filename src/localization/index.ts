import type { Language, Translations } from './types.js';
import { en } from './en.js';
import { vi } from './vi.js';
import * as db from '../database/database.js';

/**
 * All available translations
 */
const translations: Record<Language, Translations> = {
  en,
  vi,
};

/**
 * Default language
 */
const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Get translations for a specific language
 */
export function getTranslations(language: Language): Translations {
  return translations[language] || translations[DEFAULT_LANGUAGE];
}

/**
 * Get guild's preferred language
 */
export function getGuildLanguage(guildId: string): Language {
  return db.getGuildLanguage(guildId) || DEFAULT_LANGUAGE;
}

/**
 * Set guild's preferred language
 */
export function setGuildLanguage(
  guildId: string,
  language: Language
): boolean {
  return db.setGuildLanguage(guildId, language);
}

/**
 * Get translations for a specific guild
 */
export function getGuildTranslations(guildId: string): Translations {
  const language = getGuildLanguage(guildId);
  return getTranslations(language);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: Language): string {
  const names: Record<Language, string> = {
    en: 'English',
    vi: 'Tiếng Việt',
  };
  return names[language];
}

/**
 * Check if language is valid
 */
export function isValidLanguage(language: string): language is Language {
  return language === 'en' || language === 'vi';
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Language[] {
  return ['en', 'vi'];
}

// Re-export types for convenience
export type { Language, Translations };
