import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

const email = z.email().max(254);
const signInBody = z.object({ email, code: z.string().trim().min(6).max(12), rememberDevice: z.boolean().optional(), method: z.enum(['app', 'email']).optional() });
const trustedBody = z.object({ email });

export interface TotpSignInDeps {
  /** The user id when the e-mail and code are right (the code of the app, or the one e-mailed), null for every kind of failure. */
  verifySignIn(email: string, code: string, method: 'app' | 'email'): Promise<string | null>;
  /** The user id when this browser (its cookie header) is a trusted device of the person with this e-mail, null otherwise. */
  trustedSignIn(email: string, cookieHeader: string | null): Promise<string | null>;
  /** Trusts the browser of this sign-in (null when the administrator switched trusted devices off): the secret for the cookie and its days. */
  trustDevice(userId: string, userAgent: string | null): Promise<{ secret: string; days: number } | null>;
  /** Name and flags of the trusted-device cookie. */
  deviceCookie: { name: string; secure: boolean };
}

const GENERIC_FAILURE = 'The e-mail or the code is not valid';
type Ctx = Parameters<typeof setSessionCookie>[0];

/** Creates the session the official way (same cookie, same table), already marked as code-verified; the answer is the same for every failure. */
async function startSession(ctx: Ctx, userId: string | null) {
  const user = userId ? await ctx.context.internalAdapter.findUserById(userId) : null;
  if (!user) throw new APIError('UNAUTHORIZED', { message: GENERIC_FAILURE });
  const session = await ctx.context.internalAdapter.createSession(user.id, false, { mfaVerifiedAt: new Date() });
  if (!session) throw new APIError('UNAUTHORIZED', { message: GENERIC_FAILURE });
  await setSessionCookie(ctx, { session, user });
  return user;
}

/**
 * Sign in with a work e-mail and a code (no password): the 6-digit code of the authenticator app (or a backup code), or the code
 * e-mailed to the person; or with the e-mail alone on a browser the person trusted. Better Auth has no such flow, so this plugin
 * checks through our own services and then creates the session. Every failure gets the same answer, so the endpoints never reveal
 * which e-mails exist.
 */
export function totpSignIn(deps: TotpSignInDeps, maxPerMinute: number): BetterAuthPlugin {
  return {
    id: 'totp-sign-in',
    endpoints: {
      signInTotp: createAuthEndpoint('/totp/sign-in', { method: 'POST', body: signInBody }, async (ctx) => {
        const user = await startSession(ctx, await deps.verifySignIn(ctx.body.email, ctx.body.code, ctx.body.method ?? 'app'));
        const device = ctx.body.rememberDevice ? await deps.trustDevice(user.id, ctx.headers?.get('user-agent') ?? null) : null;
        if (device) await ctx.setCookie(deps.deviceCookie.name, device.secret, { httpOnly: true, sameSite: 'lax', secure: deps.deviceCookie.secure, path: '/', maxAge: device.days * 86_400 });
        return ctx.json({ user: { id: user.id, name: user.name, email: user.email } });
      }),
      signInTrusted: createAuthEndpoint('/totp/trusted-sign-in', { method: 'POST', body: trustedBody }, async (ctx) => {
        const user = await startSession(ctx, await deps.trustedSignIn(ctx.body.email, ctx.headers?.get('cookie') ?? null));
        return ctx.json({ user: { id: user.id, name: user.name, email: user.email } });
      }),
    },
    rateLimit: [{ pathMatcher: (path: string) => path === '/totp/sign-in' || path === '/totp/trusted-sign-in', window: 60, max: maxPerMinute }],
  };
}
