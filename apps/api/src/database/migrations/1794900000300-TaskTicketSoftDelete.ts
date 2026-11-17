import { MigrationInterface, QueryRunner } from "typeorm";

/** «Delete a task» (FR-157) and «delete a ticket» (FR-158) hide the record instead of erasing it: a `deleted_at` column on both tables (null = alive). */
export class TaskTicketSoftDelete1794900000300 implements MigrationInterface {
    name = 'TaskTicketSoftDelete1794900000300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_at"`);
    }
}
