import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Compass, Globe, LogOut, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router';
import type { MeDto } from '@arweqah-platform/shared';
import type { NavItem } from '@/core/feature';
import { useDisplayPreferences } from '@/core/theme/use-display-preferences';
import { cn } from '@/shared/lib/cn';
import { useTourControls } from '@/features/tour';

const ITEM = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-button)] px-3 text-sm outline-none data-[highlighted]:bg-neutral-100';

interface Props {
  me: MeDto | undefined;
  /** "My account" pages: profile, notifications, security. */
  items: NavItem[];
  onSignOut: () => void;
}

/** The signed-in person in the header; opens "My account" (the pages that used to sit in the sidebar) and sign-out. */
export function AccountMenu({ me, items, onSignOut }: Props) {
  const { t, i18n } = useTranslation();
  const role = me?.roles[0];
  const tour = useTourControls();
  const { nextTheme, toggleTheme, toggleLanguage } = useDisplayPreferences();
  const ThemeIcon = nextTheme === 'dark' ? Moon : Sun;
  const [open, setOpen] = useState(false);
  const blockWhileTour = (e: Event) => { if (tour.accountMenuForced) e.preventDefault(); };
  return (
    <Menu.Root modal={false} open={open || tour.accountMenuForced} onOpenChange={setOpen}>
      <Menu.Trigger data-tour="account-menu" aria-label={t('nav.groups.account')} className="flex items-center gap-3 rounded-[var(--radius-button)] ps-2 pe-1 transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50">
        <div className="hidden text-end leading-tight sm:block">
          <p className="text-sm font-medium">{me?.name}</p>
          {role && <p className="text-xs text-muted">{i18n.language === 'ar' ? role.nameAr : role.nameEn}</p>}
        </div>
        <span className="relative grid size-10 place-items-center rounded-full bg-petrol-800 text-sm font-bold text-cream" aria-hidden>
          {me?.name.trim().charAt(0).toUpperCase()}
          <span className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-white bg-green-400" />
        </span>
        <ChevronDown className="size-4 text-muted max-sm:hidden" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content onInteractOutside={blockWhileTour} onEscapeKeyDown={blockWhileTour} onFocusOutside={blockWhileTour} align="end" sideOffset={8} collisionPadding={16} className="animate-fade-in z-50 w-60 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl shadow-ink/10">
          <p className="px-3 py-2 text-xs text-muted" dir="ltr">{me?.email}</p>
          <Menu.Separator className="my-1 h-px bg-neutral-200" />
          {items.map((item) => (
            <Menu.Item key={item.to} asChild>
              <Link to={item.to} data-tour={`account:${item.to}`} className={ITEM}>
                <item.icon className="size-4 text-muted" aria-hidden />
                {t(item.labelKey)}
              </Link>
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1 h-px bg-neutral-200" />
          <Menu.Item className={cn(ITEM, 'sm:hidden')} onSelect={toggleTheme}>
            <ThemeIcon className="size-4 text-muted" aria-hidden />
            {t(`theme.switchTo.${nextTheme}`)}
          </Menu.Item>
          <Menu.Item className={cn(ITEM, 'sm:hidden')} onSelect={toggleLanguage}>
            <Globe className="size-4 text-muted" aria-hidden />
            {t('language.switchTo')}
          </Menu.Item>
          <Menu.Item className={ITEM} onSelect={() => void tour.restart('general')}>
            <Compass className="size-4 text-muted" aria-hidden />
            {t('restart', { ns: 'tour' })}
          </Menu.Item>
          <Menu.Item data-tour="sign-out" className={ITEM} onSelect={onSignOut}>
            <LogOut className="size-4 text-muted rtl:-scale-x-100" aria-hidden />
            {t('actions.signOut')}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
