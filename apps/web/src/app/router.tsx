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

/** A route inherits the permission of the navigation item that points at it (the 403 page shows without it). */
const permissionByPath = new Map(FEATURES.flatMap((f) => f.nav ?? []).filter((n) => n.permission).map((n) => [n.to, n.permission]));
const withPermission = (route: RouteObject): RouteObject => {
  const permission = route.path ? permissionByPath.get(`/${route.path.replace(/^\//, '')}`) : undefined;
  return permission ? { ...route, handle: { permission } } : route;
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
