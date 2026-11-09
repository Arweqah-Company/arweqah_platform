import { MigrationInterface, QueryRunner } from "typeorm";

export class CareerDevelopmentRequests1794300000400 implements MigrationInterface {
    name = 'CareerDevelopmentRequests1794300000400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "career_development_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "course_name" character varying(200) NOT NULL, "cost" integer NOT NULL, "plan" character varying(3) NOT NULL, "status" character varying(16) NOT NULL, "level" character varying(8) NOT NULL, "approver_user_id" uuid, "agreement_file_id" uuid, "budget_cap" integer, "rejection_reason" character varying(500), "decided_by" uuid, "decided_at" TIMESTAMP WITH TIME ZONE, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_7998b6806fcfe01aee3033e9261" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_career_development_requests_status" ON "career_development_requests"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_career_development_requests_approver" ON "career_development_requests"  ("approver_user_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_career_development_requests_employee" ON "career_development_requests"  ("employee_id", "submitted_at") `);
        await queryRunner.query(`CREATE TABLE "career_employee_competency_levels" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "competency" character varying(120) NOT NULL, "level" character varying(40) NOT NULL, "reached_at" TIMESTAMP WITH TIME ZONE NOT NULL, "recorded_by" uuid NOT NULL, CONSTRAINT "PK_509a13450b43b347d8f68772de2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_employee_competency_levels" ON "career_employee_competency_levels"  ("employee_id", "competency") `);
        await queryRunner.query(`ALTER TABLE "career_development_requests" ADD CONSTRAINT "FK_career_development_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_development_requests" ADD CONSTRAINT "FK_career_development_requests_file" FOREIGN KEY ("agreement_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_employee_competency_levels" ADD CONSTRAINT "FK_career_employee_competency_levels_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "career_employee_competency_levels" DROP CONSTRAINT "FK_career_employee_competency_levels_employee"`);
        await queryRunner.query(`ALTER TABLE "career_development_requests" DROP CONSTRAINT "FK_career_development_requests_file"`);
        await queryRunner.query(`ALTER TABLE "career_development_requests" DROP CONSTRAINT "FK_career_development_requests_employee"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_employee_competency_levels"`);
        await queryRunner.query(`DROP TABLE "career_employee_competency_levels"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_career_development_requests_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_career_development_requests_approver"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_career_development_requests_status"`);
        await queryRunner.query(`DROP TABLE "career_development_requests"`);
    }

}
