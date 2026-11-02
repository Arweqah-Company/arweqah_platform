import { MigrationInterface, QueryRunner } from "typeorm";

export class EmployeeAccessEnded1793621387853 implements MigrationInterface {
    name = 'EmployeeAccessEnded1793621387853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "access_ended_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "access_ended_at"`);
    }

}
