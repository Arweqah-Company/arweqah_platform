import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

const signInBody = z.object({ email: z.email().max(254), code: z.string().trim().min(6).max(12) });

export interface TotpSignInDeps {
  /** The user id when the e-mail and code are right, null for every kind of failure. */
  verifySignIn(email: string, code: string): Promise<string | null>;
}

const GENERIC_FAILURE = 'The e-mail or the code is not valid';

/**
 * Sign in with a work e-mail and the 6-digit code of the authenticator app (no password).
 * Better Auth has no such flow, so this plugin checks the code through our own authenticator service
 * and then creates the session the official way (same cookie, same table), already marked as code-verified.
 * Every failure gets the same answer, so the endpoint never reveals which e-mails exist.
 */
export function totpSignIn(deps: TotpSignInDeps, maxPerMinute: number): BetterAuthPlugin {
  return {
    id: 'totp-sign-in',
    endpoints: {
      signInTotp: createAuthEndpoint('/totp/sign-in', { method: 'POST', body: signInBody }, async (ctx) => {
        const userId = await deps.verifySignIn(ctx.body.email, ctx.body.code);
        const user = userId ? await ctx.context.internalAdapter.findUserById(userId) : null;
        if (!user) throw new APIError('UNAUTHORIZED', { message: GENERIC_FAILURE });
        const session = await ctx.context.internalAdapter.createSession(user.id, false, { mfaVerifiedAt: new Date() });
        if (!session) throw new APIError('UNAUTHORIZED', { message: GENERIC_FAILURE });
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ user: { id: user.id, name: user.name, email: user.email } });
      }),
    },
    rateLimit: [{ pathMatcher: (path: string) => path === '/totp/sign-in', window: 60, max: maxPerMinute }],
  };
}
