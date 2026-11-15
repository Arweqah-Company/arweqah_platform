import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The head role of every unit also changes the roles of the people of the unit and below (`employees.assign_roles`, limited by the
 * roles the leader holds) and reassigns the tickets of the unit's desk (`tickets.reassign`), both at `subtree` (standing rule 17).
 * Only keys a head role lacks are inserted.
 */
export class HeadRoleRolesAndReassign1794319000000 implements MigrationInterface {
    name = 'HeadRoleRolesAndReassign1794319000000'

    private readonly keys = ['employees.assign_roles', 'tickets.reassign'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given the head role before this migration.
    }
}
