import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The Employee role (rule `everyone`) holds the career path page only of the career area: the job titles page (`job_titles.view`) is taken from it
 * (owner's rule). Heads of units keep it (standing rule 17), and so do roles an administrator gave it by hand.
 */
export class EmployeeWithoutJobTitlesPage1794300000000 implements MigrationInterface {
    name = 'EmployeeWithoutJobTitlesPage1794300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule = 'everyone' AND p.permission_key = 'job_titles.view'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'job_titles.view', 'all' FROM roles r WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'job_titles.view')`);
    }
}
