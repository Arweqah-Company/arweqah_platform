import { MigrationInterface, QueryRunner } from "typeorm";

export class TourSteps1793265035234 implements MigrationInterface {
    name = 'TourSteps1793265035234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tour_step_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "step_key" character varying(40) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "sort_order" integer, "title_ar" character varying(80), "title_en" character varying(80), "body_ar" character varying(400), "body_en" character varying(400), "updated_by" uuid, CONSTRAINT "PK_33be499d039c1c7440db33b6376" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_tour_step_setting" ON "tour_step_settings"  ("step_key") `);
        await queryRunner.query(`CREATE TABLE "user_tour_progress" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "tour" character varying(20) NOT NULL, "status" character varying(20) NOT NULL, "seen_steps" text array NOT NULL DEFAULT '{}', CONSTRAINT "PK_e8b8c27c35c35ac9bf2c2e6e3e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_user_tour_progress" ON "user_tour_progress"  ("user_id", "tour") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_user_tour_progress"`);
        await queryRunner.query(`DROP TABLE "user_tour_progress"`);
        await queryRunner.query(`DROP INDEX "public"."uq_tour_step_setting"`);
        await queryRunner.query(`DROP TABLE "tour_step_settings"`);
    }

}
