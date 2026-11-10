import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Everyone may object to their own result and export it (FR-123, standing rule 17): the Employee role (rule `everyone`) and the head role of every unit
 * (rule `node_head`) get `performance.object` and `performance.export` at `all`, only where a role lacks them.
 */
export class PerformanceObjectExportGrants1794310321600 implements MigrationInterface {
    name = 'PerformanceObjectExportGrants1794310321600'

    private readonly keys = ['performance.object', 'performance.export'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`,
            [this.keys]);
    }
}
