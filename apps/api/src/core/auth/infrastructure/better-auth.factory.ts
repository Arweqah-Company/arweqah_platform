import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import type { Pool } from 'pg';
import { PASSWORD_MIN_LENGTH } from '@arweqah-platform/shared';
import type { AppConfig } from '../../../config/app-config.service';
import type { AuthLifecycle } from '../application/identity-provider';

const SIGN_IN_LIMIT = { window: 60, max: 5 };
const TWELVE_HOURS = 60 * 60 * 12;

/** Snake_case table/column mapping so auth tables match the rest of the schema. */
const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

// Declarative library configuration: one object by design, so the length limit is waived here.
// eslint-disable-next-line max-lines-per-function
export function createBetterAuth(config: AppConfig, pool: Pool, lifecycle: AuthLifecycle) {
  const microsoft = config.microsoft;
  return betterAuth({
    appName: 'Arweqah Platform',
    baseURL: config.get('API_URL'),
    basePath: '/api/auth',
    secret: config.get('BETTER_AUTH_SECRET'),
    database: pool,
    trustedOrigins: config.get('CORS_ORIGINS'),
    emailAndPassword: {
      enabled: true,
      // Accounts are created by HR/admins only, never by self sign-up.
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: 128,
    },
    socialProviders: microsoft
      ? {
          microsoft: {
            clientId: microsoft.clientId,
            clientSecret: microsoft.clientSecret,
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
    },
    verification: { modelName: 'auth_verifications', fields: { ...timestamps, expiresAt: 'expires_at' } },
    plugins: [
      twoFactor({
        issuer: 'Arweqah Platform',
        schema: {
          user: { fields: { twoFactorEnabled: 'two_factor_enabled' } },
          twoFactor: {
            modelName: 'auth_two_factors',
            fields: {
              backupCodes: 'backup_codes',
              userId: 'user_id',
              failedVerificationCount: 'failed_verification_count',
              lockedUntil: 'locked_until',
            },
          },
        },
      }),
    ],
    rateLimit: {
      enabled: true,
      storage: 'memory',
      customRules: {
        '/sign-in/email': SIGN_IN_LIMIT,
        '/sign-in/social': SIGN_IN_LIMIT,
        '/two-factor/verify-totp': SIGN_IN_LIMIT,
        '/two-factor/verify-backup-code': SIGN_IN_LIMIT,
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Deactivated users cannot start a session, whatever the sign-in method.
          before: async (session) => (await lifecycle.isActive(String(session.userId))) ? undefined : false,
          after: async (session) => lifecycle.onSignIn(String(session.userId), (session.ipAddress as string) ?? null),
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
