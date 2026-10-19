import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Better Auth client: same-origin `/api/auth`, cookie session. */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.assign('/login/two-factor');
      },
    }),
  ],
});
