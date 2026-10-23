import { useState } from 'react';
import { useMe, useSignOut } from '@/core/auth/session';
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
  const nav = FEATURES.flatMap((f) => f.nav ?? []).filter((n) => (!n.permission || can(n.permission)) && (!n.requiresAdminMode || me?.adminMode.active));

  return (
    <NavContext.Provider value={nav}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:bg-cream focus:p-2">
        Skip to content
      </a>
      <div className="flex min-h-screen items-start gap-4 bg-neutral-50 p-3 lg:p-4">
        <AppSidebar items={nav} open={open} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} onNavigate={() => setOpen(false)} onSignOut={() => void signOut()} />
        {open && <div className="fixed inset-0 z-20 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <AppHeader me={me} menuOpen={open} onToggleMenu={() => setOpen(!open)} onSignOut={() => void signOut()} />
          <main id="main" className="flex-1 px-1 pb-6 sm:px-2">
            <div className="animate-fade-in">
              <RouteOutlet />
            </div>
          </main>
        </div>
      </div>
    </NavContext.Provider>
  );
}
