import { ChevronLeft, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@/core/feature';
import { cn } from '@/shared/lib/cn';
import { BrandLogo } from '@/shared/ui';
import { SidebarNav } from './sidebar-nav';

interface SidebarProps {
  items: NavItem[];
  /** Nothing in the menu can be opened (the career-path acknowledgement is pending). */
  locked: boolean;
  /** Mobile drawer state. */
  open: boolean;
  /** Desktop: icons only. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
  onSignOut: () => void;
}

/** Why the menu cannot be used: the career-path acknowledgement is pending. */
function LockedNotice({ locked, collapsed }: { locked: boolean; collapsed: boolean }) {
  const { t } = useTranslation();
  if (!locked) return null;
  return <p role="status" className={cn('mb-3 rounded-[var(--radius-button)] bg-cream/10 px-3 py-2 text-xs text-cream', collapsed && 'lg:sr-only')}>{t('nav.locked')}</p>;
}

/** A white rounded frame holding the dark panel: logo + collapse button, section label, links (the active one is cream). */
export function AppSidebar({ items, locked, open, collapsed, onToggleCollapsed, onNavigate, onSignOut }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <aside
      data-tour="sidebar"
      className={cn(
        'fixed inset-y-3 start-3 z-30 w-[min(16rem,calc(100vw-1.5rem))] -translate-x-[115%] rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-xl shadow-ink/10 transition-[transform,width] duration-200 rtl:translate-x-[115%]',
        'lg:sticky lg:top-4 lg:bottom-auto lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:rtl:translate-x-0',
        collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64',
        open && 'translate-x-0 rtl:translate-x-0',
      )}
    >
      <div className="on-dark flex h-full flex-col overflow-y-auto overscroll-contain rounded-2xl bg-ink text-cream">
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
        <LockedNotice locked={locked} collapsed={collapsed} />
        <SidebarNav items={items} locked={locked} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
      <div className="border-t border-cream/10 p-3 lg:hidden">
        <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-button)] px-4 text-sm font-medium text-cream/85 transition-colors hover:bg-cream/10 hover:text-cream" onClick={onSignOut}>
          <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
          {t('actions.signOut')}
        </button>
      </div>
      </div>
    </aside>
  );
}
