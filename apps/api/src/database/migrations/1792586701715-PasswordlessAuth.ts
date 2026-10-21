import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordlessAuth1792586701715 implements MigrationInterface {
    name = 'PasswordlessAuth1792586701715'

    /**
     * No more passwords: removes credential accounts and the Better Auth two-factor table (the project keeps
     * its own authenticators), and marks sessions with the moment the authenticator code was entered.
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "mfa_verified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`DELETE FROM "auth_accounts" WHERE "provider_id" = 'credential'`);
        await queryRunner.query(`DROP TABLE IF EXISTS "auth_two_factors"`);
        await queryRunner.query(`CREATE TABLE "authenticators" ("user_id" uuid NOT NULL, "secret_enc" text NOT NULL, "enabled_at" TIMESTAMP WITH TIME ZONE, "last_used_step" bigint, "failed_count" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_79111b083a20c575bdd813f3b67" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "authenticator_backup_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "code_hash" character varying(64) NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9537dccb74987df97d7d6251f0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_backup_codes_user" ON "authenticator_backup_codes"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "enrollment_invites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_72fcf7417878177bcc8cd905d96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_enrollment_invites_user" ON "enrollment_invites"  ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_enrollment_invites_token" ON "enrollment_invites"  ("token_hash") `);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "requires_two_factor"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "two_factor_enabled"`);
        await queryRunner.query(`ALTER TABLE "authenticators" ADD CONSTRAINT "FK_authenticators_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authenticator_backup_codes" ADD CONSTRAINT "FK_backup_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "enrollment_invites" ADD CONSTRAINT "FK_enrollment_invites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    /** Credential accounts and the old two-factor rows are not restored. */
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "mfa_verified_at"`);
        await queryRunner.query(`ALTER TABLE "enrollment_invites" DROP CONSTRAINT "FK_enrollment_invites_user"`);
        await queryRunner.query(`ALTER TABLE "authenticator_backup_codes" DROP CONSTRAINT "FK_backup_codes_user"`);
        await queryRunner.query(`ALTER TABLE "authenticators" DROP CONSTRAINT "FK_authenticators_user"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "two_factor_enabled" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "requires_two_factor" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."UQ_enrollment_invites_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_enrollment_invites_user"`);
        await queryRunner.query(`DROP TABLE "enrollment_invites"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_backup_codes_user"`);
        await queryRunner.query(`DROP TABLE "authenticator_backup_codes"`);
        await queryRunner.query(`DROP TABLE "authenticators"`);
    }

}
