import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceEvaluations1794300000900 implements MigrationInterface {
    name = 'PerformanceEvaluations1794300000900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_evaluations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cycle_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "stage_no" integer NOT NULL, "manager_user_id" uuid, CONSTRAINT "PK_aa5ff53349b99197cde4194bda1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_performance_evaluations_employee" ON "performance_evaluations"  ("employee_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_evaluations" ON "performance_evaluations"  ("cycle_id", "employee_id") `);
        await queryRunner.query(`CREATE TABLE "performance_self_evaluations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "content" jsonb NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_98f1c1dcb8ddeed659baa8ea3a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_self_evaluations" ON "performance_self_evaluations"  ("evaluation_id") `);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" ADD CONSTRAINT "FK_performance_evaluations_cycle" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" ADD CONSTRAINT "FK_performance_evaluations_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "performance_self_evaluations" ADD CONSTRAINT "FK_performance_self_evaluations_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_self_evaluations" DROP CONSTRAINT "FK_performance_self_evaluations_evaluation"`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" DROP CONSTRAINT "FK_performance_evaluations_employee"`);
        await queryRunner.query(`ALTER TABLE "performance_evaluations" DROP CONSTRAINT "FK_performance_evaluations_cycle"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_self_evaluations"`);
        await queryRunner.query(`DROP TABLE "performance_self_evaluations"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_evaluations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_performance_evaluations_employee"`);
        await queryRunner.query(`DROP TABLE "performance_evaluations"`);
    }

}
