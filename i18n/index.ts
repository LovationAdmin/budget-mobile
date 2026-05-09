import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import { SECURE_STORE_KEYS } from '@/constants/api';
import fr from './locales/fr.json';
import en from './locales/en.json';

const SUPPORTED = ['fr', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED)[number];

function detectInitial(): SupportedLocale {
  const device = getLocales()[0]?.languageCode ?? 'fr';
  return (SUPPORTED as readonly string[]).includes(device) ? (device as SupportedLocale) : 'fr';
}

export async function initI18n(): Promise<void> {
  const stored = await SecureStore.getItemAsync(SECURE_STORE_KEYS.LOCALE);
  const lng = (stored && (SUPPORTED as readonly string[]).includes(stored))
    ? (stored as SupportedLocale)
    : detectInitial();

  await i18n.use(initReactI18next).init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function setLocale(locale: SupportedLocale): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.LOCALE, locale);
  await i18n.changeLanguage(locale);
}

export default i18n;
