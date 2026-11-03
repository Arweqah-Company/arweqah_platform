import { MigrationInterface, QueryRunner } from "typeorm";

/** «My access» (FR-88): everyone sees their own access page, including the collaborator base (own account only). */
export class MyAccessKeys1793632000000 implements MigrationInterface {
    name = 'MyAccessKeys1793632000000'

    private readonly keys = ['my_access.view', 'my_access.export'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k
            WHERE r.auto_rule IN ('everyone', 'limited_access')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'limited_access') AND p.permission_key = ANY($1)`,
            [this.keys]);
    }

}
