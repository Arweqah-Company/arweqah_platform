import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client: same-origin `/api/auth`, cookie session. Used for "sign in with Microsoft" and sign-out;
 * the e-mail + authenticator code sign-in goes through our own endpoint (see features/auth/api.ts).
 */
export const authClient = createAuthClient({ baseURL: window.location.origin, basePath: '/api/auth' });
