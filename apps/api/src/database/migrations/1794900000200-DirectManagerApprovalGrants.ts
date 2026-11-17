import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A task a person gives to themselves waits for their direct manager, who could not approve it: the automatic «Direct manager» role
 * (`auto_rule = 'has_reports'`) had no keys. It gets approve and reject at `subtree` (FR-51); only keys the role lacks are inserted.
 */
export class DirectManagerApprovalGrants1794900000200 implements MigrationInterface {
    name = 'DirectManagerApprovalGrants1794900000200'

    private readonly keys = ['tasks.approve', 'tasks.reject'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'has_reports'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [this.keys]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given to this role by hand.
    }
}
