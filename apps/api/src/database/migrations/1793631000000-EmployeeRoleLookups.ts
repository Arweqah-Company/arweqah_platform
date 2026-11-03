import { MigrationInterface, QueryRunner } from "typeorm";

/** The Employee role also reads the drop-down lists (`lookups.view`): the page of one's own employee record is built from them (decision 155). */
export class EmployeeRoleLookups1793631000000 implements MigrationInterface {
    name = 'EmployeeRoleLookups1793631000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'lookups.view', 'all' FROM roles r
            WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'lookups.view')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule = 'everyone' AND p.permission_key = 'lookups.view'`);
    }

}
