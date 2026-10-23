import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { MeDto } from '@arweqah-platform/shared';
import type { NavItem } from '@/core/feature';

const ITEM = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-neutral-100';

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
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger aria-label={t('nav.groups.account')} className="flex items-center gap-3 rounded-xl ps-2 pe-1 transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50">
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
        <Menu.Content align="end" sideOffset={8} collisionPadding={16} className="animate-fade-in z-50 w-60 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl shadow-ink/10">
          <p className="px-3 py-2 text-xs text-muted" dir="ltr">{me?.email}</p>
          <Menu.Separator className="my-1 h-px bg-neutral-200" />
          {items.map((item) => (
            <Menu.Item key={item.to} asChild>
              <Link to={item.to} className={ITEM}>
                <item.icon className="size-4 text-muted" aria-hidden />
                {t(item.labelKey)}
              </Link>
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1 h-px bg-neutral-200" />
          <Menu.Item className={ITEM} onSelect={onSignOut}>
            <LogOut className="size-4 text-muted rtl:-scale-x-100" aria-hidden />
            {t('actions.signOut')}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
