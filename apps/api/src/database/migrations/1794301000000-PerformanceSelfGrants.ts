import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Everyone writes their own self-evaluation (FR-119, standing rule 17): the Employee role (rule `everyone`) and the head role of every unit
 * (rule `node_head`) get `performance.self_evaluate` at `all`, only where a role lacks it.
 */
export class PerformanceSelfGrants1794301000000 implements MigrationInterface {
    name = 'PerformanceSelfGrants1794301000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'performance.self_evaluate', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'performance.self_evaluate')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = 'performance.self_evaluate'`);
    }
}
