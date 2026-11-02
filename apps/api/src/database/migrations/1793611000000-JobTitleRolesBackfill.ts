import { MigrationInterface, QueryRunner } from "typeorm";

/** Gives every existing job title its role (auto rule `job_title`), starting with the permissions of the Employee role (the "everyone" role). */
export class JobTitleRolesBackfill1793611000000 implements MigrationInterface {
    name = 'JobTitleRolesBackfill1793611000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            WITH template AS (SELECT p.permission_key, p.scope FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.auto_rule = 'everyone'),
            made AS (
                INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, job_title_id)
                SELECT left(coalesce((SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'ar'), (SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'en'), ''), 120),
                       left(coalesce((SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'en'), (SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'ar'), ''), 120),
                       false, 'auto', 'job_title', t.id
                FROM job_titles t WHERE t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.job_title_id = t.id)
                RETURNING id)
            INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, template.permission_key, template.scope FROM made CROSS JOIN template`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'job_title'`);
    }

}
