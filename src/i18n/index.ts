import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import no from './locales/no.json';
import da from './locales/da.json';
import sv from './locales/sv.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

// Humanize a translation key for fallback display
const humanizeKey = (key: string): string => {
  const lastPart = key.split('.').pop() || key;
  return lastPart
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
};

// Try to get English translation for a given key path
const getEnglishTranslation = (key: string): string | undefined => {
  const parts = key.split('.');
  let value: any = en.translation;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part as keyof typeof value];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
};

// Get persisted language from localStorage
const getPersistedLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app_language') || 'en';
  }
  return 'en';
};

// Persist language to localStorage
export const persistLanguage = (lang: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_language', lang);
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en.translation },
      no: { translation: no.translation },
      da: { translation: da.translation },
      sv: { translation: sv.translation },
      fr: { translation: fr.translation },
      es: { translation: es.translation },
      de: { translation: de.translation },
    },
    lng: getPersistedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key: string) => {
      // First try to get English translation as fallback
      const englishValue = getEnglishTranslation(key);
      if (englishValue) {
        return englishValue;
      }
      // Never show raw keys - return humanized fallback
      return humanizeKey(key);
    },
  });

export default i18n;
