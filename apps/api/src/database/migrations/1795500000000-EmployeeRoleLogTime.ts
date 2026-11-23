import { MigrationInterface, QueryRunner } from "typeorm";

/** The Employee role (rule `everyone`) also gets `tasks.log_time`: a person logs time on their own tasks (the button needs the key; the API still requires being the assignee). */
export class EmployeeRoleLogTime1795500000000 implements MigrationInterface {
    name = 'EmployeeRoleLogTime1795500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tasks.log_time', 'all' FROM roles r
            WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tasks.log_time')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule = 'everyone' AND p.permission_key = 'tasks.log_time'`);
    }

}
