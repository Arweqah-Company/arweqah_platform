import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceManagerReviews1794301000200 implements MigrationInterface {
    name = 'PerformanceManagerReviews1794301000200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_manager_reviews" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluation_id" uuid NOT NULL, "level" character varying(8) NOT NULL, "reviewer_user_id" uuid NOT NULL, "content" jsonb NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_07cd384634307641df887cf75ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_manager_reviews" ON "performance_manager_reviews"  ("evaluation_id", "level") `);
        await queryRunner.query(`ALTER TABLE "performance_manager_reviews" ADD CONSTRAINT "FK_performance_manager_reviews_evaluation" FOREIGN KEY ("evaluation_id") REFERENCES "performance_evaluations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_manager_reviews" DROP CONSTRAINT "FK_performance_manager_reviews_evaluation"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_manager_reviews"`);
        await queryRunner.query(`DROP TABLE "performance_manager_reviews"`);
    }

}
