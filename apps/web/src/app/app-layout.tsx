import { useState } from 'react';
import { useMe, useSignOut } from '@/core/auth/session';
import { TourProvider } from '@/features/tour';
import { ListSettingsProvider } from '@/shared/lib/list-settings';
import { NavContext } from '@/core/navigation';
import { usePermissions } from '@/core/permissions/can';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { FEATURES } from './features';
import { RouteOutlet } from './route-outlet';

export function AppLayout() {
  const me = useMe().data;
  const signOut = useSignOut();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hidden = me?.hiddenPages ?? [];
  const nav = FEATURES.flatMap((f) => f.nav ?? []).filter((n) => !n.hideFromMenu && (!n.permission || can(n.permission)) && (!n.requiresAdminMode || me?.adminMode.active) && !(n.pageKey && hidden.includes(n.pageKey)));
  // "My account" lives in the header menu, everything else in the sidebar.
  const sidebarItems = nav.filter((n) => n.group !== 'account');
  const accountItems = nav.filter((n) => n.group === 'account');

  return (
    <ListSettingsProvider value={me?.listSettings ?? {}}>
    <NavContext.Provider value={nav}>
    <TourProvider features={FEATURES} setDrawer={setOpen}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:bg-cream focus:p-2">
        Skip to content
      </a>
      <div className="flex min-h-screen items-start gap-4 bg-neutral-50 p-3 lg:p-4">
        <AppSidebar items={sidebarItems} open={open} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} onNavigate={() => setOpen(false)} onSignOut={() => void signOut()} />
        {open && <div className="fixed inset-0 z-20 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <AppHeader me={me} accountItems={accountItems} menuOpen={open} onToggleMenu={() => setOpen(!open)} onSignOut={() => void signOut()} />
          <main id="main" className="flex-1 px-1 pb-6 sm:px-2">
            <div className="animate-fade-in">
              <RouteOutlet />
            </div>
          </main>
        </div>
      </div>
    </TourProvider>
    </NavContext.Provider>
    </ListSettingsProvider>
  );
}
