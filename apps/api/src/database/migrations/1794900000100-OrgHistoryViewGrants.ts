import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The history of a unit (its versions and change log) has its own key, `org.history_view`, instead of riding on `org.view`.
 * Nobody loses what they had: the key goes to every role that can see the whole structure (`org.view_full`) or edit it (`org.unit_update`) at scope `all`,
 * and, as standing rule 17 asks, to the head role of every unit at `subtree`. The Employee role does not get it. Only keys a role lacks are inserted.
 */
export class OrgHistoryViewGrants1794900000100 implements MigrationInterface {
    name = 'OrgHistoryViewGrants1794900000100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT DISTINCT r.id, 'org.history_view', 'all' FROM roles r
            JOIN role_permissions p ON p.role_id = r.id AND p.permission_key IN ('org.view_full', 'org.unit_update')
            WHERE NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = r.id AND x.permission_key = 'org.history_view')`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'org.history_view', 'subtree' FROM roles r
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = r.id AND x.permission_key = 'org.history_view')`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could take away keys an administrator had given to these roles by hand.
    }
}
