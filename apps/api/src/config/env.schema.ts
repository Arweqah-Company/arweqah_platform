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

    /** AES-256-GCM key (base64, 32 bytes) for sensitive columns such as national IDs. */
    FIELD_ENCRYPTION_KEY: z.base64().refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'must decode to 32 bytes',
    }),

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

    SEED_ADMIN_EMAIL: z.email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
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
    if (env.FILE_STORAGE === 's3' && !env.S3_BUCKET) {
      ctx.addIssue({ code: 'custom', path: ['S3_BUCKET'], message: 'required when FILE_STORAGE=s3' });
    }
  });

export type Env = z.infer<typeof envSchema>;

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
