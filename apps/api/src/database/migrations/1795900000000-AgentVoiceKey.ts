import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Speaking to the assistant (`agent.use_voice`, FR-181) goes into the Employee role (rule `everyone`) and the head role of every unit (standing rule 17).
 * Only roles that lack the key get it. Whether it works depends on the AI service that is switched on (Claude takes no sound).
 */
export class AgentVoiceKey1795900000000 implements MigrationInterface {
    name = 'AgentVoiceKey1795900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'agent.use_voice', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'agent.use_voice')`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could not tell the rows this added from the ones an administrator gave.
    }
}
