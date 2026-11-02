import { MigrationInterface, QueryRunner } from "typeorm";

/** The Employee role and the roles of job titles (copied from it) let a person see their own employee record and edit a few fields of it (scope own). */
export class EmployeeSelfService1793628000000 implements MigrationInterface {
    name = 'EmployeeSelfService1793628000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k, 'own' FROM roles r CROSS JOIN (VALUES ('employees.view'), ('employees.update')) AS keys(k)
            WHERE r.auto_rule IN ('everyone', 'job_title')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM role_permissions p USING roles r
            WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'job_title') AND p.scope = 'own' AND p.permission_key IN ('employees.view', 'employees.update')`);
    }

}
