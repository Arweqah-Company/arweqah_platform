import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Everyone sees their own career path and acknowledges it: the Employee role (rule `everyone`) and the head role of every unit (rule `node_head`)
 * get `career_profile.view`, `career_acknowledge.create` and `career_learning.export`, only where a role lacks them (standing rule 17; decision 155 for the Employee role).
 */
export class CareerOwnPathGrants1794158703374 implements MigrationInterface {
    name = 'CareerOwnPathGrants1794158703374'

    private readonly keys = ['career_profile.view', 'career_acknowledge.create', 'career_learning.export'];

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
