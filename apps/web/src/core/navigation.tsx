import { createContext, useContext } from 'react';
import { LifeBuoy, ListChecks, Settings2, UserCog, UsersRound, type LucideIcon } from 'lucide-react';
import type { NavGroupId, NavItem } from './feature';

/** Navigation items the signed-in user may see; provided by the app layout. */
export const NavContext = createContext<NavItem[]>([]);
export const useNavItems = (): NavItem[] => useContext(NavContext);

export const NAV_GROUPS: Record<NavGroupId, { labelKey: string; icon: LucideIcon }> = {
  people: { labelKey: 'nav.groups.people', icon: UsersRound },
  tasks: { labelKey: 'nav.groups.tasks', icon: ListChecks },
  tickets: { labelKey: 'nav.groups.tickets', icon: LifeBuoy },
  administration: { labelKey: 'nav.groups.administration', icon: Settings2 },
  account: { labelKey: 'nav.groups.account', icon: UserCog },
};

export type NavEntry = { kind: 'link'; item: NavItem } | { kind: 'group'; id: NavGroupId; items: NavItem[] };

/** Top-level links and menus in the order their first item appears. */
export function buildNavEntries(items: NavItem[]): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const item of items) {
    if (!item.group) {
      entries.push({ kind: 'link', item });
      continue;
    }
    const existing = entries.find((e): e is Extract<NavEntry, { kind: 'group' }> => e.kind === 'group' && e.id === item.group);
    if (existing) existing.items.push(item);
    else entries.push({ kind: 'group', id: item.group, items: [item] });
  }
  return entries;
}
