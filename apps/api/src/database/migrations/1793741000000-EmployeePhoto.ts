import { MigrationInterface, QueryRunner } from "typeorm";

/** The profile photo of an employee (FR-91) and the directory keys (FR-92): everyone holds the Employee role, so everyone sees the directory and changes their own photo. */
export class EmployeePhoto1793741000000 implements MigrationInterface {
    name = 'EmployeePhoto1793741000000'

    private readonly grants = [['employees.photo_update', 'own'], ['directory.view', 'all']];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "photo_file_id" uuid`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_photo_file" FOREIGN KEY ("photo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, g.key, g.scope FROM roles r CROSS JOIN jsonb_to_recordset($1::jsonb) AS g(key text, scope text)
            WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = g.key)`,
            [JSON.stringify(this.grants.map(([key, scope]) => ({ key, scope })))]);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT p.role_id, 'employees.photo_update', p.scope FROM role_permissions p
            WHERE p.permission_key = 'employees.update' AND p.scope <> 'own'
            AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = p.role_id AND x.permission_key = 'employees.photo_update')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key IN ('employees.photo_update', 'directory.view')`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_photo_file"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "photo_file_id"`);
    }

}
