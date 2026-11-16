import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The platform assistant is for every employee (owner's choice): its three keys go into the Employee role (rule `everyone`) and, as standing rule 17 asks,
 * into the head role of every unit (`auto_rule = 'node_head'`). Only keys a role lacks are inserted. What the assistant does for a person still goes
 * through the key of each action, so this gives no one a power they did not have.
 */
export class AgentGrants1794824368700 implements MigrationInterface {
    name = 'AgentGrants1794824368700'

    private readonly keys = ['agent.view', 'agent.use', 'agent.history_view'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [this.keys]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given to these roles by hand.
    }
}
