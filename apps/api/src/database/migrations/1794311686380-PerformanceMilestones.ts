import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceMilestones1794311686380 implements MigrationInterface {
    name = 'PerformanceMilestones1794311686380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_milestones" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "milestone_key" character varying(16) NOT NULL, "where_we_are" text NOT NULL DEFAULT '', "obstacle" text NOT NULL DEFAULT '', "agreed_action" text NOT NULL DEFAULT '', "note" text NOT NULL DEFAULT '', "recorded_by" uuid NOT NULL, "acknowledged_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c3cffa125efac7be437a9a35b50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_milestones" ON "performance_milestones"  ("evaluation_id", "milestone_key") `);
        await queryRunner.query(`ALTER TABLE "performance_milestones" ADD CONSTRAINT "FK_performance_milestones_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_milestones" DROP CONSTRAINT "FK_performance_milestones_evaluation"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_milestones"`);
        await queryRunner.query(`DROP TABLE "performance_milestones"`);
    }

}
