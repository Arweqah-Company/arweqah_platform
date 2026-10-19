import { createBrowserRouter, Outlet } from 'react-router';
import { RequireAuth, SessionWatcher } from '@/core/auth/session';
import { AppLayout } from './app-layout';
import { FEATURES } from './features';
import { NotFoundPage } from './not-found-page';

function Root() {
  return (
    <>
      <SessionWatcher />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      ...FEATURES.flatMap((f) => f.publicRoutes ?? []),
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [...FEATURES.flatMap((f) => f.routes ?? []), { path: '*', Component: NotFoundPage }],
      },
    ],
  },
]);
