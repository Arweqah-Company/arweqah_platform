import { MigrationInterface, QueryRunner } from "typeorm";

/** Bulk edit of employees (FR-93): given to the roles that already edit employees across a company or everywhere. */
export class EmployeeBulkUpdate1793742000000 implements MigrationInterface {
    name = 'EmployeeBulkUpdate1793742000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT p.role_id, 'employees.bulk_update', p.scope FROM role_permissions p
            WHERE p.permission_key = 'employees.update' AND p.scope IN ('company', 'all')
            AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = p.role_id AND x.permission_key = 'employees.bulk_update')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key = 'employees.bulk_update'`);
    }

}
