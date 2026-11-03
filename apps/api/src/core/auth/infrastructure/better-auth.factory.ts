import { betterAuth } from 'better-auth';
import type { Pool } from 'pg';
import type { AppConfig } from '../../../config/app-config.service';
import type { AuthLifecycle } from '../application/identity-provider';
import { createMicrosoftCertificateAssertion } from './microsoft-certificate-assertion';
import { impersonationSessions } from './impersonation.plugin';
import { totpSignIn, type TotpSignInDeps } from './totp-sign-in.plugin';

const TWELVE_HOURS = 60 * 60 * 12;

/** Snake_case table/column mapping so auth tables match the rest of the schema. */
const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

// Declarative library configuration: one object by design, so the length limit is waived here.
// eslint-disable-next-line max-lines-per-function
export function createBetterAuth(config: AppConfig, pool: Pool, lifecycle: AuthLifecycle, totp: TotpSignInDeps) {
  const microsoft = config.microsoft;
  const signInLimit = { window: 60, max: config.get('SIGN_IN_RATE_LIMIT') };
  return betterAuth({
    appName: 'Arweqah Platform',
    baseURL: config.get('API_URL'),
    basePath: '/api/auth',
    secret: config.get('BETTER_AUTH_SECRET'),
    database: pool,
    trustedOrigins: config.get('CORS_ORIGINS'),
    // No passwords anywhere: Microsoft, or e-mail + authenticator code (the totp-sign-in plugin). No self sign-up.
    emailAndPassword: { enabled: false },
    socialProviders: microsoft
      ? {
          microsoft: {
            clientId: microsoft.clientId,
            ...(microsoft.credential.kind === 'secret'
              ? { clientSecret: microsoft.credential.secret }
              : { clientAssertion: createMicrosoftCertificateAssertion(microsoft.credential) }),
            // Company tenant only (validated at boot); unknown accounts are refused.
            tenantId: microsoft.tenantId,
            disableSignUp: true,
            prompt: 'select_account',
          },
        }
      : {},
    account: {
      // Safe only because the tenant is restricted to the company directory.
      accountLinking: { enabled: true, trustedProviders: microsoft ? ['microsoft'] : [] },
      modelName: 'auth_accounts',
      fields: {
        ...timestamps,
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
      },
    },
    user: {
      modelName: 'users',
      fields: { ...timestamps, emailVerified: 'email_verified' },
      additionalFields: { locale: { type: 'string', defaultValue: 'ar', input: false } },
    },
    session: {
      modelName: 'auth_sessions',
      expiresIn: TWELVE_HOURS,
      updateAge: 60 * 60,
      fields: { ...timestamps, expiresAt: 'expires_at', ipAddress: 'ip_address', userAgent: 'user_agent', userId: 'user_id' },
      // Set when the code of the authenticator app was entered. Every route is blocked until it is set.
      additionalFields: {
        mfaVerifiedAt: { type: 'date', required: false, input: false, fieldName: 'mfa_verified_at' },
        // «Sign in as»: set only on the session of a platform administrator working as this person.
        impersonatedByUserId: { type: 'string', required: false, input: false, fieldName: 'impersonated_by_user_id' },
        impersonatorSessionId: { type: 'string', required: false, input: false, fieldName: 'impersonator_session_id' },
        impersonationLastActivityAt: { type: 'date', required: false, input: false, fieldName: 'impersonation_last_activity_at' },
      },
    },
    verification: { modelName: 'auth_verifications', fields: { ...timestamps, expiresAt: 'expires_at' } },
    plugins: [totpSignIn(totp, signInLimit.max), impersonationSessions()],
    rateLimit: {
      enabled: true,
      storage: 'memory',
      customRules: {
        '/sign-in/social': signInLimit,
        '/totp/sign-in': signInLimit,
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Deactivated users cannot start a session, whatever the sign-in method.
          before: async (session) => (await lifecycle.isActive(String(session.userId))) ? undefined : false,
          // Working as someone else is not that person signing in: it has its own audit entries.
          after: async (session) => {
            if (!session.impersonatedByUserId) lifecycle.onSignIn(String(session.userId), (session.ipAddress as string) ?? null);
          },
        },
      },
    },
    advanced: {
      database: { generateId: 'uuid' },
      useSecureCookies: config.isProduction,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
      // nginx overwrites X-Forwarded-For with the real client address.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    telemetry: { enabled: false },
  });
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
