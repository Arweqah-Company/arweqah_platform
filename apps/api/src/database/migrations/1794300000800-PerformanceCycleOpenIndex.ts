import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceCycleOpenIndex1794300000800 implements MigrationInterface {
    name = 'PerformanceCycleOpenIndex1794300000800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_cycles" ADD "is_open" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`UPDATE "performance_cycles" SET "is_open" = false WHERE "status" = 'closed'`); // a closed cycle is not the open one
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_performance_cycles_open" ON "performance_cycles"  ("is_open") WHERE is_open`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_performance_cycles_open"`);
        await queryRunner.query(`ALTER TABLE "performance_cycles" DROP COLUMN "is_open"`);
    }

}
