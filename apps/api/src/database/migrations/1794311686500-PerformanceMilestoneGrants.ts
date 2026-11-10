import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The milestones of the year (FR-121, standing rule 17): the head role of every unit (rule `node_head`) sees and records its people's milestones at `subtree`
 * (`performance.milestone_view`, `performance.milestone_record`); everyone, and every head, may acknowledge reading their own (`performance.milestone_ack`, `all`).
 * Only where a role lacks the key.
 */
export class PerformanceMilestoneGrants1794311686500 implements MigrationInterface {
    name = 'PerformanceMilestoneGrants1794311686500'

    private readonly teamKeys = ['performance.milestone_view', 'performance.milestone_record'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.teamKeys]);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'performance.milestone_ack', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'performance.milestone_ack')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`,
            [[...this.teamKeys, 'performance.milestone_ack']]);
    }
}
