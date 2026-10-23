import { createBrowserRouter, Outlet, type RouteObject } from 'react-router';
import { RequireAuth, SessionWatcher } from '@/core/auth/session';
import { AppLayout } from './app-layout';
import { FEATURES } from './features';
import { NotFoundPage } from './not-found-page';
import { SessionEndedPage } from './session-ended-page';

function Root() {
  return (
    <>
      <SessionWatcher />
      <Outlet />
    </>
  );
}

/** A route inherits the permission and the admin-mode need of the navigation item that points at it. */
const navByPath = new Map(FEATURES.flatMap((f) => f.nav ?? []).map((n) => [n.to, n]));
const withPermission = (route: RouteObject): RouteObject => {
  const nav = route.path ? navByPath.get(`/${route.path.replace(/^\//, '')}`) : undefined;
  const handle = { ...(nav?.permission && { permission: nav.permission }), ...(nav?.requiresAdminMode && { adminMode: true }) };
  return Object.keys(handle).length ? { ...route, handle } : route;
};

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      ...FEATURES.flatMap((f) => f.publicRoutes ?? []),
      { path: '/401', Component: SessionEndedPage },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [...FEATURES.flatMap((f) => f.routes ?? []).map(withPermission), { path: '*', Component: NotFoundPage }],
      },
    ],
  },
]);
