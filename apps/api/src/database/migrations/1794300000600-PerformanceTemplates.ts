import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceTemplates1794300000600 implements MigrationInterface {
    name = 'PerformanceTemplates1794300000600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "stage_no" integer NOT NULL, "name" character varying(120) NOT NULL, "template" jsonb NOT NULL, "source_version" integer NOT NULL DEFAULT '1', "updated_by" uuid, CONSTRAINT "PK_58b170a4017f0730c3f7a6b5a7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_templates_stage" ON "performance_templates"  ("stage_no") `);
        await queryRunner.query(`CREATE TABLE "performance_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" character varying(40) NOT NULL, "value" jsonb NOT NULL, "updated_by" uuid, CONSTRAINT "PK_6576e65b0a1fd386826c1d4b0f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_settings_key" ON "performance_settings"  ("key") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_settings_key"`);
        await queryRunner.query(`DROP TABLE "performance_settings"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_templates_stage"`);
        await queryRunner.query(`DROP TABLE "performance_templates"`);
    }

}
