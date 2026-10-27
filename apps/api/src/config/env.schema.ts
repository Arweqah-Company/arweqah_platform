import { z } from 'zod';

const secret = z.string().min(32, 'must be at least 32 characters');
const csv = z.string().transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

/** Every environment variable the API reads. Validated once at boot. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3000),
    APP_URL: z.url(),
    API_URL: z.url(),
    CORS_ORIGINS: csv,
    SWAGGER_ENABLED: z.stringbool().default(false),

    DB_HOST: z.string(),
    DB_PORT: z.coerce.number().int().default(5432),
    DB_NAME: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_SSL: z.stringbool().default(false),

    BETTER_AUTH_SECRET: secret,
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_TENANT_ID: z.string().optional(),
    /** Alternative to MICROSOFT_CLIENT_SECRET for tenants that block secrets: a certificate (thumbprint + private key). */
    MICROSOFT_CERT_THUMBPRINT: z.string().regex(/^[0-9a-fA-F]{40}$/, 'must be the 40-character SHA-1 thumbprint').optional(),
    MICROSOFT_CERT_PRIVATE_KEY: z.string().optional(),
    MICROSOFT_CERT_PRIVATE_KEY_FILE: z.string().optional(),

    /** AES-256-GCM key (base64, 32 bytes) for sensitive columns such as national IDs. */
    FIELD_ENCRYPTION_KEY: z.base64().refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'must decode to 32 bytes',
    }),

    /** Key for the keyed hash (HMAC-SHA256) that makes encrypted ID numbers searchable and unique. */
    BLIND_INDEX_KEY: secret,

    MESSAGE_BUS: z.enum(['rabbitmq', 'memory']).default('rabbitmq'),
    RABBITMQ_URL: z.string().default('amqp://localhost:5672'),

    MAIL_FROM: z.string().default('Arweqah Platform <no-reply@example.com>'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: z.stringbool().default(false),

    FILE_STORAGE: z.enum(['s3', 'local']).default('local'),
    LOCAL_STORAGE_DIR: z.string().default('./storage'),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default('me-south-1'),

    /** Amazon Translate fills the English field while a person types Arabic. Both keys or none; none turns the helper off. */
    TRANSLATE_AWS_ACCESS_KEY_ID: z.string().optional(),
    TRANSLATE_AWS_SECRET_ACCESS_KEY: z.string().optional(),
    TRANSLATE_AWS_REGION: z.string().default('us-east-1'),

    SEED_ADMIN_EMAIL: z.email().optional(),
    /** Local development only: links an authenticator app to the first admin so sign-in works before Microsoft is set up. */
    SEED_ADMIN_TOTP_SECRET: z.string().regex(/^[A-Z2-7]{16,64}$/, 'must be a base32 secret').optional(),
    /** Sign-in attempts per minute and IP (e-mail + code, Microsoft). Raised only for automated browser tests. */
    SIGN_IN_RATE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(5),
    /** Development only: demo ticket desks and sample tickets (the real organization structure is seeded everywhere). */
    SEED_DEMO_ORG: z.stringbool().default(false),
    SEED_ADMIN_NAME: z.string().default('System Admin'),
  })
  .superRefine((env, ctx) => {
    if (env.MICROSOFT_CLIENT_ID && !isSpecificTenant(env.MICROSOFT_TENANT_ID)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MICROSOFT_TENANT_ID'],
        message: 'must be the company tenant GUID (common/organizations/consumers are not allowed)',
      });
    }
    if (env.MICROSOFT_CLIENT_ID) checkMicrosoftCredential(env, ctx);
    if (env.NODE_ENV === 'production') forbidDevelopmentSettings(env, ctx);
    if (!!env.TRANSLATE_AWS_ACCESS_KEY_ID !== !!env.TRANSLATE_AWS_SECRET_ACCESS_KEY) {
      ctx.addIssue({ code: 'custom', path: ['TRANSLATE_AWS_SECRET_ACCESS_KEY'], message: 'set TRANSLATE_AWS_ACCESS_KEY_ID and TRANSLATE_AWS_SECRET_ACCESS_KEY together' });
    }
    if (env.FILE_STORAGE === 's3' && !env.S3_BUCKET) {
      ctx.addIssue({ code: 'custom', path: ['S3_BUCKET'], message: 'required when FILE_STORAGE=s3' });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Microsoft needs exactly one way to prove the app's identity: a client secret, or a certificate. */
function checkMicrosoftCredential(env: Pick<Env, 'MICROSOFT_CLIENT_SECRET' | 'MICROSOFT_CERT_THUMBPRINT' | 'MICROSOFT_CERT_PRIVATE_KEY' | 'MICROSOFT_CERT_PRIVATE_KEY_FILE'>, ctx: z.RefinementCtx): void {
  const certificate = !!env.MICROSOFT_CERT_THUMBPRINT && !!(env.MICROSOFT_CERT_PRIVATE_KEY || env.MICROSOFT_CERT_PRIVATE_KEY_FILE);
  if (env.MICROSOFT_CLIENT_SECRET && (env.MICROSOFT_CERT_THUMBPRINT || env.MICROSOFT_CERT_PRIVATE_KEY || env.MICROSOFT_CERT_PRIVATE_KEY_FILE)) {
    ctx.addIssue({ code: 'custom', path: ['MICROSOFT_CLIENT_SECRET'], message: 'use either a client secret or a certificate, not both' });
  }
  if (!env.MICROSOFT_CLIENT_SECRET && !certificate) {
    ctx.addIssue({ code: 'custom', path: ['MICROSOFT_CLIENT_SECRET'], message: 'set MICROSOFT_CLIENT_SECRET, or MICROSOFT_CERT_THUMBPRINT with MICROSOFT_CERT_PRIVATE_KEY(_FILE)' });
  }
}

/** Settings that only make sense while developing or testing are refused in production. */
function forbidDevelopmentSettings(env: Pick<Env, 'SIGN_IN_RATE_LIMIT' | 'SEED_DEMO_ORG' | 'SEED_ADMIN_TOTP_SECRET'>, ctx: z.RefinementCtx): void {
  const refuse = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (env.SIGN_IN_RATE_LIMIT > 10) refuse('SIGN_IN_RATE_LIMIT', 'must be 10 or less in production');
  if (env.SEED_DEMO_ORG) refuse('SEED_DEMO_ORG', 'must not be set in production');
  if (env.SEED_ADMIN_TOTP_SECRET) refuse('SEED_ADMIN_TOTP_SECRET', 'must not be set in production');
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isSpecificTenant(tenant: string | undefined): boolean {
  return !!tenant && GUID.test(tenant);
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
