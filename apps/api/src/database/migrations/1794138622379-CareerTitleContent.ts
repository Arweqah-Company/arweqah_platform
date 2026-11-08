import { MigrationInterface, QueryRunner } from "typeorm";

export class CareerTitleContent1794138622379 implements MigrationInterface {
    name = 'CareerTitleContent1794138622379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "career_title_content" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title_id" uuid NOT NULL, "version" integer NOT NULL DEFAULT '1', "status" character varying(10) NOT NULL DEFAULT 'draft', "content" jsonb NOT NULL, "updated_by" uuid, CONSTRAINT "PK_bd676bfea82f5fbee2ed9d9655d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_title_content_title" ON "career_title_content"  ("title_id") `);
        await queryRunner.query(`CREATE TABLE "career_title_content_versions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title_id" uuid NOT NULL, "version" integer NOT NULL, "content" jsonb NOT NULL, "saved_by" uuid, CONSTRAINT "PK_bf07e1cd56b020d3f8ce2bff587" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_career_title_content_versions" ON "career_title_content_versions"  ("title_id", "version") `);
        await queryRunner.query(`ALTER TABLE "career_title_content" ADD CONSTRAINT "FK_career_title_content_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "career_title_content_versions" ADD CONSTRAINT "FK_career_title_content_versions_title" FOREIGN KEY ("title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "career_title_content_versions" DROP CONSTRAINT "FK_career_title_content_versions_title"`);
        await queryRunner.query(`ALTER TABLE "career_title_content" DROP CONSTRAINT "FK_career_title_content_title"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_title_content_versions"`);
        await queryRunner.query(`DROP TABLE "career_title_content_versions"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_career_title_content_title"`);
        await queryRunner.query(`DROP TABLE "career_title_content"`);
    }

}
