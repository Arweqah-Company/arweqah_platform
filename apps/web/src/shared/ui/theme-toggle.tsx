import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/core/theme/theme';
import { useDisplayPreferences } from '@/core/theme/use-display-preferences';
import { Button } from './button';

/** Switches between the light and the dark theme and saves the choice on the account. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { resolved } = useTheme();
  const { nextTheme: next, toggleTheme } = useDisplayPreferences();
  const Icon = resolved === 'dark' ? Sun : Moon;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t(`theme.switchTo.${next}`)}
      title={t(`theme.switchTo.${next}`)}
      onClick={toggleTheme}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  );
}
