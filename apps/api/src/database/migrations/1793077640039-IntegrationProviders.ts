import { MigrationInterface, QueryRunner } from "typeorm";

export class IntegrationProviders1793077640039 implements MigrationInterface {
    name = 'IntegrationProviders1793077640039'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "integration_providers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "kind" character varying(20) NOT NULL, "provider_key" character varying(30) NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "verified_hash" character varying(64), "verified_at" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT false, "updated_by" uuid, CONSTRAINT "PK_2c3b6dbe85f50abb5dcc96e6858" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_integration_active_per_kind" ON "integration_providers"  ("kind") WHERE "is_active"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_integration_provider" ON "integration_providers"  ("kind", "provider_key") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_integration_provider"`);
        await queryRunner.query(`DROP INDEX "public"."uq_integration_active_per_kind"`);
        await queryRunner.query(`DROP TABLE "integration_providers"`);
    }

}
