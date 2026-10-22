import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/core/i18n';
import { useTheme, type ThemePreference } from '@/core/theme/theme';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { cn } from '@/shared/lib/cn';
import { FormField, SectionCard, Select } from '@/shared/ui';

const THEMES: { id: ThemePreference; icon: LucideIcon }[] = [{ id: 'light', icon: Sun }, { id: 'dark', icon: Moon }, { id: 'system', icon: Monitor }];

/** Theme and language: applied at once and saved on the account. */
export function AppearanceSection() {
  const { t, i18n } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const { preference, setPreference } = useTheme();
  const save = useSavePreferences();
  return (
    <SectionCard id="appearance" title={t('appearance.title')} description={t('appearance.description')}>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-fg">{t('appearance.theme')}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(({ id, icon: Icon }) => (
            <label key={id} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm transition-colors', preference === id ? 'border-link bg-petrol-50 text-fg' : 'border-neutral-200 hover:border-neutral-500')}>
              <input type="radio" name="theme" className="size-4 accent-petrol-800" checked={preference === id} onChange={() => { setPreference(id); save.mutate({ theme: id }); }} />
              <Icon className="size-5 text-link" aria-hidden />
              {tc(`theme.${id}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField label={t('appearance.language')}>
        {(p) => (
          <Select {...p} value={i18n.language} onChange={(e) => { const lang = e.target.value === 'en' ? 'en' : 'ar'; setLanguage(lang); save.mutate({ locale: lang }); }}>
            <option value="ar">{tc('language.ar')}</option>
            <option value="en">{tc('language.en')}</option>
          </Select>
        )}
      </FormField>
    </SectionCard>
  );
}
