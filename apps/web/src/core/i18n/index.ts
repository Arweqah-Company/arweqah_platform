import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'ar' | 'en';
const STORAGE_KEY = 'arweqah.language';

function initialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

void i18n.use(initReactI18next).init({
  resources: { ar: { common: ar }, en: { common: en } },
  lng: initialLanguage(),
  fallbackLng: 'ar',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

/** Feature modules add their own namespace (called from the app registry). */
export function addTranslations(namespace: string, resources: Record<Language, Record<string, unknown>>): void {
  for (const lang of ['ar', 'en'] as const) i18n.addResourceBundle(lang, namespace, resources[lang], true, true);
}

export function applyDocumentLanguage(lang: Language): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang);
  applyDocumentLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
}

applyDocumentLanguage(i18n.language as Language);
export default i18n;
