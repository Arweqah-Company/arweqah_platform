import { MigrationInterface, QueryRunner } from "typeorm";

export class CareerAcknowledgements1794158703373 implements MigrationInterface {
    name = 'CareerAcknowledgements1794158703373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "career_acknowledgements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "title_id" uuid NOT NULL, "content_version" integer NOT NULL, "acknowledged_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_a915a8697d3e4b28aedf3d133d8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_acknowledgements" ON "career_acknowledgements"  ("employee_id", "title_id", "content_version") `);
        await queryRunner.query(`CREATE TABLE "career_ack_reopenings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title_id" uuid NOT NULL, "reason" character varying(300) NOT NULL, "reopened_by" uuid, CONSTRAINT "PK_e01af0d5bd6a13f6be1a0541c32" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_career_ack_reopenings_title" ON "career_ack_reopenings"  ("title_id") `);
        await queryRunner.query(`ALTER TABLE "career_acknowledgements" ADD CONSTRAINT "FK_career_acknowledgements_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_acknowledgements" ADD CONSTRAINT "FK_career_acknowledgements_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_ack_reopenings" ADD CONSTRAINT "FK_career_ack_reopenings_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "career_ack_reopenings" DROP CONSTRAINT "FK_career_ack_reopenings_title"`);
        await queryRunner.query(`ALTER TABLE "career_acknowledgements" DROP CONSTRAINT "FK_career_acknowledgements_title"`);
        await queryRunner.query(`ALTER TABLE "career_acknowledgements" DROP CONSTRAINT "FK_career_acknowledgements_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_career_ack_reopenings_title"`);
        await queryRunner.query(`DROP TABLE "career_ack_reopenings"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_acknowledgements"`);
        await queryRunner.query(`DROP TABLE "career_acknowledgements"`);
    }

}
