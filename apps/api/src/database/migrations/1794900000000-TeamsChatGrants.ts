import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Chat on Teams» (FR-154): the key goes into the Employee role (rule `everyone`) and, as standing rule 17 asks, into the head role of every unit
 * (`auto_rule = 'node_head'`), at scope `all` (a link to a chat widens no data). Only keys a role lacks are inserted.
 */
export class TeamsChatGrants1794900000000 implements MigrationInterface {
    name = 'TeamsChatGrants1794900000000'

    private readonly keys = ['directory.contact_teams'];

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
