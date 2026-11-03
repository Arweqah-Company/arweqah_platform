import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

const openBody = z.object({ userId: z.uuid(), impersonatorUserId: z.uuid(), impersonatorSessionId: z.uuid() });
const returnBody = z.object({ token: z.string().min(10) });

/**
 * Two server-only endpoints (never reachable over HTTP) behind «sign in as»: one creates the session of the person the administrator works as,
 * already code-verified and pointing to the administrator, and sets its cookie; the other puts the administrator's own session cookie back.
 * Who may call them is decided in the application service, not here.
 */
export function impersonationSessions() {
  return {
    id: 'impersonation-sessions',
    endpoints: {
      openImpersonation: createAuthEndpoint('/impersonation/open', { method: 'POST', body: openBody, metadata: { SERVER_ONLY: true } }, async (ctx) => {
        const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
        if (!user) throw new APIError('NOT_FOUND', { message: 'The account was not found' });
        const now = new Date();
        const session = await ctx.context.internalAdapter.createSession(user.id, false, {
          mfaVerifiedAt: now,
          impersonatedByUserId: ctx.body.impersonatorUserId,
          impersonatorSessionId: ctx.body.impersonatorSessionId,
          impersonationLastActivityAt: now,
        });
        if (!session) throw new APIError('UNAUTHORIZED', { message: 'The session could not be created' });
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ ok: true });
      }),
      returnFromImpersonation: createAuthEndpoint('/impersonation/return', { method: 'POST', body: returnBody, metadata: { SERVER_ONLY: true } }, async (ctx) => {
        const found = await ctx.context.internalAdapter.findSession(ctx.body.token);
        if (!found) throw new APIError('UNAUTHORIZED', { message: 'The session is gone' });
        await setSessionCookie(ctx, { session: found.session, user: found.user });
        return ctx.json({ ok: true });
      }),
    },
  } satisfies BetterAuthPlugin;
}
