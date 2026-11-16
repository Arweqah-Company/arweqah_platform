import { MigrationInterface, QueryRunner } from "typeorm";

export class AgentLinksAndForms1794834312452 implements MigrationInterface {
    name = 'AgentLinksAndForms1794834312452'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_messages" ADD "links" jsonb`);
        await queryRunner.query(`ALTER TABLE "agent_messages" ADD "form" jsonb`);
        await queryRunner.query(`ALTER TABLE "agent_messages" ADD "form_status" character varying(10)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_messages" DROP COLUMN "form_status"`);
        await queryRunner.query(`ALTER TABLE "agent_messages" DROP COLUMN "form"`);
        await queryRunner.query(`ALTER TABLE "agent_messages" DROP COLUMN "links"`);
    }

}
