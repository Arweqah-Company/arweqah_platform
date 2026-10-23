import { ChevronLeft, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@/core/feature';
import { cn } from '@/shared/lib/cn';
import { BrandLogo } from '@/shared/ui';
import { SidebarNav } from './sidebar-nav';

interface SidebarProps {
  items: NavItem[];
  /** Mobile drawer state. */
  open: boolean;
  /** Desktop: icons only. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
  onSignOut: () => void;
}

/** Floating dark panel: logo + collapse button, section label, pill-shaped links (the active one is cream). */
export function AppSidebar({ items, open, collapsed, onToggleCollapsed, onNavigate, onSignOut }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <aside
      className={cn(
        'on-dark fixed inset-y-3 start-3 z-30 flex w-64 -translate-x-[115%] flex-col overflow-y-auto rounded-3xl bg-ink text-cream shadow-xl shadow-ink/20 transition-[transform,width] duration-200 rtl:translate-x-[115%]',
        'lg:sticky lg:top-4 lg:bottom-auto lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:rtl:translate-x-0',
        collapsed && 'lg:w-[4.75rem]',
        open && 'translate-x-0 rtl:translate-x-0',
      )}
    >
      <div className={cn('flex items-center gap-3 border-b border-cream/10 px-5 py-5', collapsed && 'lg:justify-center lg:px-0')}>
        <BrandLogo tone="white" layout="horizontal" width={150} decorative className={cn(collapsed && 'lg:hidden')} />
        <button
          type="button"
          className={cn('hidden size-9 shrink-0 place-items-center rounded-full bg-cream text-ink transition-transform duration-150 hover:scale-105 lg:grid', !collapsed && 'ms-auto')}
          aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <ChevronLeft className={cn('size-4 transition-transform duration-200 rtl:rotate-180', collapsed && 'rotate-180 rtl:rotate-0')} aria-hidden />
        </button>
      </div>
      <nav aria-label={t('appName')} className="flex-1 px-3 py-5">
        <p className={cn('mb-3 px-3 text-xs text-cream/70', collapsed && 'lg:sr-only')}>{t('nav.sections')}</p>
        <SidebarNav items={items} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
      <div className="border-t border-cream/10 p-3 lg:hidden">
        <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-medium text-cream/85 transition-colors hover:bg-cream/10 hover:text-cream" onClick={onSignOut}>
          <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
          {t('actions.signOut')}
        </button>
      </div>
    </aside>
  );
}
