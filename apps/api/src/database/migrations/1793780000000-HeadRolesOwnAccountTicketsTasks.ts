import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Head roles (one per organization unit, made automatically) also hold the leader's own account pages and the tickets and tasks of the unit and below.
 * Only the keys new in this change are added (the older head defaults are left out, so one an administrator took off is not given back), and only where a role lacks them.
 */
export class HeadRolesOwnAccountTicketsTasks1793780000000 implements MigrationInterface {
    name = 'HeadRolesOwnAccountTicketsTasks1793780000000'

    private readonly grants = [
        ['profile.view', 'all'],
        ['profile.update', 'all'],
        ['security.view', 'all'],
        ['my_access.view', 'all'],
        ['my_access.export', 'all'],
        ['notifications.view', 'all'],
        ['notifications.mark_read', 'all'],
        ['tasks.team_change_status', 'subtree'],
        ['tasks.update', 'subtree'],
        ['tasks.reopen', 'subtree'],
        ['tickets.view', 'subtree'],
        ['tickets.reply', 'subtree'],
        ['tickets.setup_view', 'subtree'],
        ['tickets.setup_edit', 'subtree'],
        ['tickets.type_create', 'subtree'],
        ['tickets.type_update', 'subtree'],
        ['tickets.type_delete', 'subtree'],
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, g.key, g.scope FROM roles r CROSS JOIN jsonb_to_recordset($1::jsonb) AS g(key text, scope text)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = g.key)`,
            [JSON.stringify(this.grants.map(([key, scope]) => ({ key, scope })))]);
    }

    public async down(): Promise<void> {
        // The added grants cannot be told apart from ones an administrator gave later: nothing is removed.
    }
}
