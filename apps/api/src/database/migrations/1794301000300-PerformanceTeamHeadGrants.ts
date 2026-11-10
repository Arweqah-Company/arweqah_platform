import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The head role of every unit (rule `node_head`) sees «team evaluation» for its unit and below and evaluates its people:
 * `performance.team_view`, `performance.team_evaluate` and `performance.team_export` at `subtree`, only where a role lacks them (standing rule 17).
 */
export class PerformanceTeamHeadGrants1794301000300 implements MigrationInterface {
    name = 'PerformanceTeamHeadGrants1794301000300'

    private readonly keys = ['performance.team_view', 'performance.team_evaluate', 'performance.team_export'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule = 'node_head' AND p.permission_key = ANY($1)`,
            [this.keys]);
    }
}
