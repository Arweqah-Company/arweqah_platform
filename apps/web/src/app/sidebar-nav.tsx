import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import type { NavGroupId, NavItem } from '@/core/feature';
import { buildNavEntries, NAV_GROUPS } from '@/core/navigation';
import { cn } from '@/shared/lib/cn';

interface Props {
  items: NavItem[];
  /** Desktop icon-only mode: menus are flattened so every icon stays one click away. */
  collapsed: boolean;
  onNavigate: () => void;
}

const linkClass = (isActive: boolean, extra?: string) =>
  cn(
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-[background-color,color] duration-150',
    isActive ? 'bg-cream text-ink shadow-sm' : 'text-cream/85 hover:bg-cream/10 hover:text-cream',
    extra,
  );

function SidebarLink({ item, collapsed, onNavigate, nested }: { item: NavItem; collapsed: boolean; onNavigate: () => void; nested?: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate} title={collapsed ? t(item.labelKey) : undefined} className={({ isActive }) => linkClass(isActive, cn(collapsed && 'lg:justify-center lg:px-0', nested && 'py-2.5'))}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className={cn(collapsed && 'lg:sr-only')}>{t(item.labelKey)}</span>
    </NavLink>
  );
}

function SidebarMenu({ id, items, open, onToggle, onNavigate }: { id: NavGroupId; items: NavItem[]; open: boolean; onToggle: () => void; onNavigate: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const group = NAV_GROUPS[id];
  const Icon = group.icon;
  const hasActive = items.some((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)));
  return (
    <li>
      <button type="button" aria-expanded={open} aria-controls={`menu-${id}`} onClick={onToggle} className={cn(linkClass(false, 'w-full'), hasActive && 'text-cream')}>
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className="flex-1 text-start">{t(group.labelKey)}</span>
        <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul id={`menu-${id}`} className="ms-6 mt-1 flex flex-col gap-1 border-s border-cream/15 ps-3">
          {items.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} collapsed={false} onNavigate={onNavigate} nested />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Top-level links and collapsible menus with their sub-links; the menu holding the current page opens by itself. */
export function SidebarNav({ items, collapsed, onNavigate }: Props) {
  const { pathname } = useLocation();
  const entries = buildNavEntries(items);
  const activeGroup = entries.find((e) => e.kind === 'group' && e.items.some((i) => pathname.startsWith(i.to)));
  // What the person toggled wins; otherwise the menu holding the current page is open.
  const [toggled, setToggled] = useState<Partial<Record<NavGroupId, boolean>>>({});
  const isOpen = (id: NavGroupId) => toggled[id] ?? (activeGroup?.kind === 'group' && activeGroup.id === id);
  const toggle = (id: NavGroupId) => setToggled((prev) => ({ ...prev, [id]: !isOpen(id) }));

  return (
    <ul className="flex flex-col gap-1">
      {collapsed
        ? items.map((item) => <li key={item.to}><SidebarLink item={item} collapsed onNavigate={onNavigate} /></li>)
        : entries.map((e) =>
            e.kind === 'link' ? (
              <li key={e.item.to}><SidebarLink item={e.item} collapsed={false} onNavigate={onNavigate} /></li>
            ) : (
              <SidebarMenu key={e.id} id={e.id} items={e.items} open={isOpen(e.id)} onToggle={() => toggle(e.id)} onNavigate={onNavigate} />
            ),
          )}
    </ul>
  );
}
