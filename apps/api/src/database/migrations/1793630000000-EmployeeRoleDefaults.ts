import { MigrationInterface, QueryRunner } from "typeorm";

/** The one Employee role (rule `everyone`) also gives the structure page and the person's own tasks with their conversations, as the owner chose (decision 155). */
export class EmployeeRoleDefaults1793630000000 implements MigrationInterface {
    name = 'EmployeeRoleDefaults1793630000000'

    private readonly grants = [
        ['org.view', 'all'], ['tasks.view', 'own'], ['tasks.create', 'all'], ['tasks.update', 'own'], ['tasks.change_status', 'own'],
        ['tasks.comment_view', 'all'], ['tasks.comment_add', 'all'], ['tasks.comment_reply', 'all'], ['tasks.comment_mention', 'all'],
        ['tasks.comment_edit', 'all'], ['tasks.comment_delete', 'all'],
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, g.key, g.scope FROM roles r CROSS JOIN jsonb_to_recordset($1::jsonb) AS g(key text, scope text)
            WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = g.key)`,
            [JSON.stringify(this.grants.map(([key, scope]) => ({ key, scope })))]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule = 'everyone' AND p.permission_key = ANY($1)`,
            [this.grants.map(([key]) => key)]);
    }

}
