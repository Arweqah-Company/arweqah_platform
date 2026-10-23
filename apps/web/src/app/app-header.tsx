import { Globe, LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MeDto } from '@arweqah-platform/shared';
import type { NavItem } from '@/core/feature';
import { AdminModeToggle } from '@/core/admin-mode/admin-mode-toggle';
import { setLanguage } from '@/core/i18n';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { NotificationBell } from '@/features/notifications';
import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import { AccountMenu } from './account-menu';

interface HeaderProps {
  me: MeDto | undefined;
  accountItems: NavItem[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSignOut: () => void;
}

/** Floating rounded bar: menu button (phone), language, notifications, the signed-in person with the account menu, sign-out. */
export function AppHeader({ me, accountItems, menuOpen, onToggleMenu, onSignOut }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const save = useSavePreferences();
  return (
    <header className="sticky top-3 z-10 flex h-16 items-center justify-between rounded-2xl border border-neutral-200 bg-white/95 px-3 shadow-sm shadow-ink/5 backdrop-blur sm:px-5 lg:top-4">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.menu')} aria-expanded={menuOpen} onClick={onToggleMenu}>
        <Menu className="size-5" />
      </Button>
      <BrandLogo layout="horizontal" width={96} className="lg:hidden" />
      <div className="ms-auto flex items-center gap-0.5 sm:gap-3">
        <AccountMenu me={me} items={accountItems} onSignOut={onSignOut} />
        <AdminModeToggle />
        <NotificationBell />
        <ThemeToggle />
        <Button variant="secondary" size="sm" className="gap-2 border-neutral-500 text-fg max-sm:size-11 max-sm:px-0" aria-label={t('language.switchTo')} onClick={() => { const next = i18n.language === 'ar' ? 'en' : 'ar'; setLanguage(next); save.mutate({ locale: next }); }}>
          <Globe className="size-4" aria-hidden />
          <span className="max-sm:sr-only">{t('language.switchTo')}</span>
        </Button>
        <Button variant="ghost" size="icon" className="max-lg:hidden" aria-label={t('actions.signOut')} onClick={onSignOut}>
          <LogOut className="size-5 rtl:-scale-x-100" />
        </Button>
      </div>
    </header>
  );
}
