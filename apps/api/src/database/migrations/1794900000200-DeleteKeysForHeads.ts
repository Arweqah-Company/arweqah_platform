import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Delete a task» (`tasks.delete`, FR-157) and «delete a ticket» (`tickets.delete`, FR-158) go into the head role of every unit at `subtree`
 * (standing rule 17). They are not given to the Employee role or to any other role. Only keys a head role lacks are inserted.
 */
export class DeleteKeysForHeads1794900000200 implements MigrationInterface {
    name = 'DeleteKeysForHeads1794900000200'

    private readonly keys = ['tasks.delete', 'tickets.delete'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [this.keys]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given the head role before this migration.
    }
}
