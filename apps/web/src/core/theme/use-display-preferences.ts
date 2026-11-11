import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import { useTheme } from './theme';
import { useSavePreferences } from './use-save-preferences';

/** Theme and language switches, saved on the account: one place for the header buttons and the phone's account menu. */
export function useDisplayPreferences() {
  const { i18n } = useTranslation();
  const { resolved, setPreference } = useTheme();
  const save = useSavePreferences();
  const nextTheme = resolved === 'dark' ? 'light' : 'dark';
  return {
    nextTheme,
    toggleTheme: () => {
      setPreference(nextTheme);
      save.mutate({ theme: nextTheme });
    },
    toggleLanguage: () => {
      const next = i18n.language === 'ar' ? 'en' : 'ar';
      setLanguage(next);
      save.mutate({ locale: next });
    },
  };
}
