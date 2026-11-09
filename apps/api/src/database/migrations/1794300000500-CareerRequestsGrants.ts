import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Development requests (FR-116) and competency levels (FR-117), standing rule 17. Everyone sends their own request: the Employee role (rule `everyone`)
 * and the head role (rule `node_head`) get `career_requests.create` at `all`. The head role of every unit also gets, at `subtree`, the page of the
 * requests it decides (view, approve, reject, export) and the recording of a competency level for its team, only where a role lacks them.
 */
export class CareerRequestsGrants1794300000500 implements MigrationInterface {
    name = 'CareerRequestsGrants1794300000500'

    private readonly own = ['career_requests.create'];
    private readonly team = ['career_requests.view', 'career_requests.approve', 'career_requests.reject', 'career_requests.export', 'career_competency.record'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.grant(queryRunner, ['everyone', 'node_head'], this.own, 'all');
        await this.grant(queryRunner, ['node_head'], this.team, 'subtree');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`,
            [[...this.own, ...this.team]]);
    }

    private grant(queryRunner: QueryRunner, rules: string[], keys: string[], scope: string): Promise<unknown> {
        return queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, $3 FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = ANY($2)
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [keys, rules, scope]);
    }
}
