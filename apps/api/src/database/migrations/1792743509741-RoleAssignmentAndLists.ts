import { MigrationInterface, QueryRunner } from "typeorm";

export class RoleAssignmentAndLists1792743509741 implements MigrationInterface {
    name = 'RoleAssignmentAndLists1792743509741'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "list_settings" ("list_key" character varying(40) NOT NULL, "hidden_columns" jsonb NOT NULL DEFAULT '[]', "hidden_filters" jsonb NOT NULL DEFAULT '[]', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_66cf25846f3035658e7bc18c8d8" PRIMARY KEY ("list_key"))`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "assignment" character varying(10) NOT NULL DEFAULT 'manual'`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "auto_rule" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "auto_rule"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "assignment"`);
        await queryRunner.query(`DROP TABLE "list_settings"`);
    }

}
