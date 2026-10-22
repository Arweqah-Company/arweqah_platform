import type { MeDto } from '@arweqah-platform/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ME_KEY } from '../auth/session';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isPreference = (value: unknown): value is ThemePreference => value === 'light' || value === 'dark' || value === 'system';

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

/** The theme saved on the signed-in account, read from the session cache without observing (or refetching) it. */
function useSavedTheme(): ThemePreference | undefined {
  const client = useQueryClient();
  const me = useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () => client.getQueryData<MeDto>(ME_KEY),
  );
  return me?.theme;
}

/** Applies the chosen theme to <html data-theme>, follows the device when the choice is "system", and remembers it in this browser. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<ThemePreference>(readPreference);
  // A theme saved on the account (light or dark) applies on a new device or browser; "system" is the default, so then this
  // browser's own choice stays. The person's own change in this page wins over both.
  const [chosen, setChosen] = useState<ThemePreference | null>(null);
  const saved = useSavedTheme();
  const preference = chosen ?? (saved && saved !== 'system' ? saved : stored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolved: ResolvedTheme = preference === 'dark' || (preference === 'system' && systemDark) ? 'dark' : 'light';

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_QUERY);
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference: (next) => {
        setChosen(next);
        setStored(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // The choice simply is not remembered in this browser.
        }
      },
    }),
    [preference, resolved],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
