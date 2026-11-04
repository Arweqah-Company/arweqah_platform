import { MigrationInterface, QueryRunner } from "typeorm";

/** The employee's history tab (FR-90): every role that sees employees sees their history, at the same reach. */
export class EmployeeHistoryView1793740000000 implements MigrationInterface {
    name = 'EmployeeHistoryView1793740000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT p.role_id, 'employees.history_view', p.scope FROM role_permissions p
            WHERE p.permission_key = 'employees.view'
            AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = p.role_id AND x.permission_key = 'employees.history_view')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key = 'employees.history_view'`);
    }

}
