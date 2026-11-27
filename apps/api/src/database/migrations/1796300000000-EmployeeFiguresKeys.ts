import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The employee numbers on the home page answer to three keys of their own (FR-208) instead of «view employees beyond my own record»:
 * `employees.figures_headcount`, `employees.figures_id_expiring`, `employees.figures_contract_ending`. They go into the head role of every
 * unit (standing rule 17, at `subtree`) and into the roles that already view employees at the company or all scope (HR and administrators), at
 * that scope. The Employee role and roles with a narrower reach are not given them: an administrator can, from the permissions page.
 * Only a role that lacks a key is given it.
 */
export class EmployeeFiguresKeys1796300000000 implements MigrationInterface {
    name = 'EmployeeFiguresKeys1796300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const key of ['employees.figures_headcount', 'employees.figures_id_expiring', 'employees.figures_contract_ending']) {
            await queryRunner.query(`
                INSERT INTO role_permissions (role_id, permission_key, scope)
                SELECT r.id, $1::varchar, 'subtree' FROM roles r
                WHERE r.auto_rule = 'node_head'
                AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = $1)`, [key]);
            await queryRunner.query(`
                INSERT INTO role_permissions (role_id, permission_key, scope)
                SELECT v.role_id, $1::varchar, v.scope FROM role_permissions v
                JOIN roles r ON r.id = v.role_id
                WHERE v.permission_key = 'employees.view' AND v.scope IN ('company', 'all') AND r.auto_rule IS NULL
                AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = v.role_id AND p.permission_key = $1)`, [key]);
        }
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could not tell the rows this added from the ones an administrator gave.
    }
}
