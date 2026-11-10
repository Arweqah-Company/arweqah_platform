import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceResults1794310321504 implements MigrationInterface {
    name = 'PerformanceResults1794310321504'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_calibrations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "adjustment" numeric(4,1) NOT NULL DEFAULT '0', "reason" text, "adjusted_by" uuid NOT NULL, CONSTRAINT "PK_dcad55c5fb68bfd6db728e3beb0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_calibrations" ON "performance_calibrations"  ("evaluation_id") `);
        await queryRunner.query(`CREATE TABLE "performance_results" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "final_score" numeric(5,1) NOT NULL, "level_name" character varying(100), "breakdown" jsonb NOT NULL, "approved_by" uuid NOT NULL, "approved_at" TIMESTAMP WITH TIME ZONE NOT NULL, "notified_at" TIMESTAMP WITH TIME ZONE, "objection_until" date, CONSTRAINT "PK_2b683b242e6612bf193931431a5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_results" ON "performance_results"  ("evaluation_id") `);
        await queryRunner.query(`CREATE TABLE "performance_objections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "item_kind" character varying(16) NOT NULL, "item_ref" character varying(16) NOT NULL, "reason" text NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'open', "decided_by" uuid, "decision_reason" text, "decided_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0cb1f7226203fcae1a37be9eb73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_objections" ON "performance_objections"  ("evaluation_id") `);
        await queryRunner.query(`ALTER TABLE "performance_calibrations" ADD CONSTRAINT "FK_performance_calibrations_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_results" ADD CONSTRAINT "FK_performance_results_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_objections" ADD CONSTRAINT "FK_performance_objections_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_objections" DROP CONSTRAINT "FK_performance_objections_evaluation"`);
        await queryRunner.query(`ALTER TABLE "performance_results" DROP CONSTRAINT "FK_performance_results_evaluation"`);
        await queryRunner.query(`ALTER TABLE "performance_calibrations" DROP CONSTRAINT "FK_performance_calibrations_evaluation"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_objections"`);
        await queryRunner.query(`DROP TABLE "performance_objections"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_results"`);
        await queryRunner.query(`DROP TABLE "performance_results"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_calibrations"`);
        await queryRunner.query(`DROP TABLE "performance_calibrations"`);
    }

}
