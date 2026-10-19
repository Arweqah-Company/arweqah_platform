import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tables owned by Better Auth (not TypeORM entities). Column names follow the
 * snake_case mapping in core/auth/infrastructure/better-auth.factory.ts.
 */
export class AuthTables1792389936441 implements MigrationInterface {
  name = 'AuthTables1792389936441';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "auth_sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "token" text NOT NULL UNIQUE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "ip_address" text,
      "user_agent" text,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE)`);
    await q.query(`CREATE INDEX "IDX_auth_sessions_user" ON "auth_sessions" ("user_id")`);

    await q.query(`CREATE TABLE "auth_accounts" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "access_token_expires_at" TIMESTAMP WITH TIME ZONE,
      "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE,
      "scope" text,
      "password" text,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "IDX_auth_accounts_user" ON "auth_accounts" ("user_id")`);
    await q.query(`CREATE UNIQUE INDEX "UQ_auth_accounts_provider" ON "auth_accounts" ("provider_id", "account_id")`);

    await q.query(`CREATE TABLE "auth_verifications" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "IDX_auth_verifications_identifier" ON "auth_verifications" ("identifier")`);

    await q.query(`CREATE TABLE "auth_two_factors" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "secret" text NOT NULL,
      "backup_codes" text NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "verified" boolean DEFAULT true,
      "failed_verification_count" integer DEFAULT 0,
      "locked_until" TIMESTAMP WITH TIME ZONE)`);
    await q.query(`CREATE INDEX "IDX_auth_two_factors_user" ON "auth_two_factors" ("user_id")`);
    await q.query(`CREATE INDEX "IDX_auth_two_factors_secret" ON "auth_two_factors" ("secret")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const table of ['auth_two_factors', 'auth_verifications', 'auth_accounts', 'auth_sessions']) {
      await q.query(`DROP TABLE "${table}"`);
    }
  }
}
