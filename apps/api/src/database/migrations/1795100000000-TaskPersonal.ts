import { MigrationInterface, QueryRunner } from "typeorm";

/** A personal task (FR-165): only its owner sees it; no approval, no review, not in the team views. */
export class TaskPersonal1795100000000 implements MigrationInterface {
    name = 'TaskPersonal1795100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "is_personal" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_personal"`);
    }
}
