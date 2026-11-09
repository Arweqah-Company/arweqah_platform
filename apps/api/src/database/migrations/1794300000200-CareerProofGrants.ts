import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Everyone sends proofs of their own learning units and ticks the items of their own «required» list: the Employee role (rule `everyone`) and the
 * head role of every unit (rule `node_head`) get `career_learning.upload` and `career_required.tick`, only where a role lacks them (standing rule 17).
 */
export class CareerProofGrants1794300000200 implements MigrationInterface {
    name = 'CareerProofGrants1794300000200'

    private readonly keys = ['career_learning.upload', 'career_required.tick'];

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
