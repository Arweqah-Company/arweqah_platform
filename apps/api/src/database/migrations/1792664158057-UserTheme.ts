import { MigrationInterface, QueryRunner } from "typeorm";

export class UserTheme1792664158057 implements MigrationInterface {
    name = 'UserTheme1792664158057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "theme" character varying(10) NOT NULL DEFAULT 'system'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "theme"`);
    }

}
