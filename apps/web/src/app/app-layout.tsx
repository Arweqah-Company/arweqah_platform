import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { useMe, useSignOut } from '@/core/auth/session';
import { setLanguage } from '@/core/i18n';
import { NavContext } from '@/core/navigation';
import { usePermissions } from '@/core/permissions/can';
import { NotificationBell } from '@/features/notifications';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import { FEATURES } from './features';

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const me = useMe().data;
  const signOut = useSignOut();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const nav = FEATURES.flatMap((f) => f.nav ?? []).filter((n) => !n.permission || can(n.permission));

  return (
    <NavContext.Provider value={nav}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2">
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 start-0 z-30 w-64 -translate-x-full bg-navy-900 text-navy-100 transition-transform rtl:translate-x-full lg:static lg:translate-x-0 lg:rtl:translate-x-0',
            open && 'translate-x-0 rtl:translate-x-0',
          )}
        >
          <div className="px-6 py-6 font-heading text-lg font-bold text-white">{t('appName')}</div>
          <nav aria-label={t('appName')}>
            <ul>
              {nav.map(({ to, labelKey, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 border-s-[3px] px-6 py-2.5 text-sm transition-colors',
                        isActive ? 'border-gold-500 bg-navy-800 text-white' : 'border-transparent hover:bg-navy-800/60 hover:text-white',
                      )
                    }
                  >
                    <Icon className="size-4" aria-hidden />
                    {t(labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        {open && <div className="fixed inset-0 z-20 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              <Menu className="size-5" />
            </Button>
            <div className="ms-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>
                {t('language.switchTo')}
              </Button>
              <NotificationBell />
              <span className="hidden px-2 text-sm text-muted sm:inline">{me?.name}</span>
              <Button variant="ghost" size="icon" aria-label={t('actions.signOut')} onClick={() => void signOut()}>
                <LogOut className="size-5" />
              </Button>
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-8 sm:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </NavContext.Provider>
  );
}
