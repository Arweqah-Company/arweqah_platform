import { MigrationInterface, QueryRunner } from "typeorm";

export class CareerLearningRecords1794300000100 implements MigrationInterface {
    name = 'CareerLearningRecords1794300000100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "career_learning_records" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "title_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "status" character varying(16) NOT NULL, "proof_kind" character varying(16) NOT NULL, "file_id" uuid, "note" character varying(500), "minutes" integer NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "decided_by" uuid, "decided_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" character varying(500), "rejection_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6bde183a5e0669868672f6a69d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_career_learning_records_status" ON "career_learning_records"  ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_learning_records" ON "career_learning_records"  ("employee_id", "unit_id") `);
        await queryRunner.query(`CREATE TABLE "career_required_progress" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "title_id" uuid NOT NULL, "item_index" integer NOT NULL, "done_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_996ea5fae4aed744f8c264739df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_required_progress" ON "career_required_progress"  ("employee_id", "title_id", "item_index") `);
        await queryRunner.query(`ALTER TABLE "career_learning_records" ADD CONSTRAINT "FK_career_learning_records_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_learning_records" ADD CONSTRAINT "FK_career_learning_records_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_learning_records" ADD CONSTRAINT "FK_career_learning_records_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_required_progress" ADD CONSTRAINT "FK_career_required_progress_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_required_progress" ADD CONSTRAINT "FK_career_required_progress_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "career_required_progress" DROP CONSTRAINT "FK_career_required_progress_title"`);
        await queryRunner.query(`ALTER TABLE "career_required_progress" DROP CONSTRAINT "FK_career_required_progress_employee"`);
        await queryRunner.query(`ALTER TABLE "career_learning_records" DROP CONSTRAINT "FK_career_learning_records_file"`);
        await queryRunner.query(`ALTER TABLE "career_learning_records" DROP CONSTRAINT "FK_career_learning_records_title"`);
        await queryRunner.query(`ALTER TABLE "career_learning_records" DROP CONSTRAINT "FK_career_learning_records_employee"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_required_progress"`);
        await queryRunner.query(`DROP TABLE "career_required_progress"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_learning_records"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_career_learning_records_status"`);
        await queryRunner.query(`DROP TABLE "career_learning_records"`);
    }

}
