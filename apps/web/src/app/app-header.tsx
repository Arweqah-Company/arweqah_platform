import { Globe, LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MeDto } from '@arweqah-platform/shared';
import { setLanguage } from '@/core/i18n';
import { NotificationBell } from '@/features/notifications';
import { BrandLogo, Button } from '@/shared/ui';

function UserChip({ me }: { me: MeDto | undefined }) {
  const { i18n } = useTranslation();
  const role = me?.roles[0];
  return (
    <div className="flex items-center gap-3 ps-2">
      <div className="hidden text-end leading-tight sm:block">
        <p className="text-sm font-medium">{me?.name}</p>
        {role && <p className="text-xs text-muted">{i18n.language === 'ar' ? role.nameAr : role.nameEn}</p>}
      </div>
      <span className="relative grid size-10 place-items-center rounded-full bg-petrol-800 text-sm font-bold text-cream" aria-hidden>
        {me?.name.trim().charAt(0).toUpperCase()}
        <span className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-cream bg-green-400" />
      </span>
    </div>
  );
}

interface HeaderProps {
  me: MeDto | undefined;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSignOut: () => void;
}

/** Floating rounded bar: menu button (phone), language, notifications, the signed-in person, sign-out. */
export function AppHeader({ me, menuOpen, onToggleMenu, onSignOut }: HeaderProps) {
  const { t, i18n } = useTranslation();
  return (
    <header className="sticky top-3 z-10 flex h-16 items-center justify-between rounded-2xl border border-neutral-200 bg-white/95 px-3 shadow-sm shadow-ink/5 backdrop-blur sm:px-5 lg:top-4">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.menu')} aria-expanded={menuOpen} onClick={onToggleMenu}>
        <Menu className="size-5" />
      </Button>
      <BrandLogo layout="horizontal" width={110} className="lg:hidden" />
      <div className="ms-auto flex items-center gap-2 sm:gap-3">
        <UserChip me={me} />
        <NotificationBell />
        <Button variant="secondary" size="sm" className="gap-2 border-neutral-500 text-ink max-sm:size-11 max-sm:px-0" aria-label={t('language.switchTo')} onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>
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
