import { Globe, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CorePermission, type MeDto } from '@arweqah-platform/shared';
import type { NavItem } from '@/core/feature';
import { AdminModeToggle } from '@/core/admin-mode/admin-mode-toggle';
import { usePermissions } from '@/core/permissions/can';
import { useDisplayPreferences } from '@/core/theme/use-display-preferences';
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

/** Floating rounded bar: menu button (phone), admin mode, notifications, theme, language, and last the signed-in person with the account menu (it holds sign-out). */
export function AppHeader({ me, accountItems, menuOpen, onToggleMenu, onSignOut }: HeaderProps) {
  const { t } = useTranslation();
  const { toggleLanguage } = useDisplayPreferences();
  const { can } = usePermissions();
  return (
    <header className="sticky top-3 z-10 flex h-16 items-center justify-between rounded-2xl border border-neutral-200 bg-white/95 px-3 shadow-sm shadow-ink/5 backdrop-blur sm:px-5 lg:top-4">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.menu')} aria-expanded={menuOpen} onClick={onToggleMenu}>
        <Menu className="size-5" />
      </Button>
      <BrandLogo layout="horizontal" width={88} className="lg:hidden" />
      <div className="ms-auto flex items-center gap-0.5 sm:gap-3">
        <span data-tour="admin-mode" className="inline-flex"><AdminModeToggle /></span>
        {can(CorePermission.NotificationsView) && <span data-tour="notifications" className="inline-flex"><NotificationBell /></span>}
        {/* On a phone these two live in the account menu so the bar keeps only menu, logo, admin mode, bell and avatar. */}
        <span data-tour="language-theme" className="flex items-center gap-0.5 max-sm:hidden sm:gap-3">
        <ThemeToggle />
        <Button variant="secondary" size="sm" className="gap-2 border-neutral-500 text-fg" aria-label={t('language.switchTo')} onClick={toggleLanguage}>
          <Globe className="size-4" aria-hidden />
          <span>{t('language.switchTo')}</span>
        </Button>
        </span>
        <AccountMenu me={me} items={accountItems} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
