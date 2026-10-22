import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/core/theme/theme';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { Button } from './button';

/** Switches between the light and the dark theme and saves the choice on the account. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { resolved, setPreference } = useTheme();
  const save = useSavePreferences();
  const next = resolved === 'dark' ? 'light' : 'dark';
  const Icon = resolved === 'dark' ? Sun : Moon;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t(`theme.switchTo.${next}`)}
      title={t(`theme.switchTo.${next}`)}
      onClick={() => {
        setPreference(next);
        save.mutate({ theme: next });
      }}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  );
}
