import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Pictures in the assistant chat (FR-180): the table that ties a stored file to the message it came with, and the key `agent.attach_image` for the Employee role
 * (rule `everyone`) and the head role of every unit (standing rule 17). Only roles that lack the key get it.
 */
export class AgentMessageFiles1795800000000 implements MigrationInterface {
    name = 'AgentMessageFiles1795800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "agent_message_files" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "message_id" uuid NOT NULL, "file_id" uuid NOT NULL, "position" smallint NOT NULL DEFAULT '0', CONSTRAINT "UQ_agent_message_files_file" UNIQUE ("file_id"), CONSTRAINT "PK_153e374c0971deaefb716533d6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agent_message_files_message" ON "agent_message_files"  ("message_id") `);
        await queryRunner.query(`ALTER TABLE "agent_message_files" ADD CONSTRAINT "FK_0f5d3384e09d31e478c279d6257" FOREIGN KEY ("message_id") REFERENCES "agent_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_message_files" ADD CONSTRAINT "FK_f58d8e69787751b591c983b82b8" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'agent.attach_image', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'agent.attach_image')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // The key rows stay: a delete could not tell the ones this added from those an administrator gave.
        await queryRunner.query(`ALTER TABLE "agent_message_files" DROP CONSTRAINT "FK_f58d8e69787751b591c983b82b8"`);
        await queryRunner.query(`ALTER TABLE "agent_message_files" DROP CONSTRAINT "FK_0f5d3384e09d31e478c279d6257"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_message_files_message"`);
        await queryRunner.query(`DROP TABLE "agent_message_files"`);
    }

}
