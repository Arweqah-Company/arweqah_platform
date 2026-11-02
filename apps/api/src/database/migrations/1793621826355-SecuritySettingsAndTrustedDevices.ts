import { MigrationInterface, QueryRunner } from "typeorm";

export class SecuritySettingsAndTrustedDevices1793621826355 implements MigrationInterface {
    name = 'SecuritySettingsAndTrustedDevices1793621826355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "security_settings" ("key" character varying(60) NOT NULL, "value" integer NOT NULL, "updated_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_670c3847bed21e95bbe4d1033d2" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "trusted_devices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "label" character varying(200) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_bc545fd72c357ff2edc8bbc7deb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_trusted_devices_user" ON "trusted_devices"  ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_trusted_devices_token" ON "trusted_devices"  ("token_hash") `);
        await queryRunner.query(`ALTER TABLE "trusted_devices" ADD CONSTRAINT "FK_trusted_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trusted_devices" DROP CONSTRAINT "FK_trusted_devices_user"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_trusted_devices_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_trusted_devices_user"`);
        await queryRunner.query(`DROP TABLE "trusted_devices"`);
        await queryRunner.query(`DROP TABLE "security_settings"`);
    }

}
