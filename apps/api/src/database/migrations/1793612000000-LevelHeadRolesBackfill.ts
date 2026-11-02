import { MigrationInterface, QueryRunner } from "typeorm";

/** Gives every existing organization level its head role (auto rule `node_head`) and hands it to the managers of the units at that level. */
export class LevelHeadRolesBackfill1793612000000 implements MigrationInterface {
    name = 'LevelHeadRolesBackfill1793612000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const defaults = JSON.stringify([
            { key: 'employees.view', scope: 'subtree' },
            { key: 'tasks.team_view', scope: 'subtree' },
            { key: 'tasks.matrix_view', scope: 'subtree' },
            { key: 'tasks.approve', scope: 'subtree' },
            { key: 'tasks.reject', scope: 'subtree' },
            { key: 'tickets.figures_view', scope: 'subtree' },
        ]);
        await queryRunner.query(`
            WITH made AS (
                INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, org_level_id)
                SELECT left('قائد ' || coalesce((SELECT x.name FROM org_level_translations x WHERE x.org_level_id = l.id AND x.lang = 'ar'), (SELECT x.name FROM org_level_translations x WHERE x.org_level_id = l.id AND x.lang = 'en'), ''), 120),
                       left('Head of ' || coalesce((SELECT x.name FROM org_level_translations x WHERE x.org_level_id = l.id AND x.lang = 'en'), (SELECT x.name FROM org_level_translations x WHERE x.org_level_id = l.id AND x.lang = 'ar'), ''), 120),
                       false, 'auto', 'node_head', l.id
                FROM org_levels l WHERE l.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.org_level_id = l.id)
                RETURNING id)
            INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, d.key, d.scope FROM made CROSS JOIN jsonb_to_recordset($1::jsonb) AS d(key text, scope text)`, [defaults]);
        await queryRunner.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT DISTINCT e.user_id, r.id FROM org_nodes n JOIN employees e ON e.id = n.manager_id AND e.deleted_at IS NULL
            JOIN roles r ON r.auto_rule = 'node_head' AND r.org_level_id = n.org_level_id WHERE n.deleted_at IS NULL AND n.is_active ON CONFLICT DO NOTHING`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'node_head'`);
    }

}
