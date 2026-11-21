import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import de from '../locales/de.json';
import en from '../locales/en.json';

export type Lang = 'de' | 'en';

export function deviceLanguage(): Lang {
  return getLocales()[0]?.languageCode === 'de' ? 'de' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
