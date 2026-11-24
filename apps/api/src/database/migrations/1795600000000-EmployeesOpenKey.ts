import { MigrationInterface, QueryRunner } from "typeorm";

/** Each table of grants and the column that says who holds the grant. */
const TABLES: Record<string, string> = { role_permissions: 'role_id', role_group_permissions: 'group_id', user_group_permissions: 'group_id', user_permissions: 'user_id' };

/**
 * «Open an employee» (`employees.open`) is the eye on the row, the click on the row and the employee's page, apart from «view employees» (the list).
 * Everybody who could see the list keeps opening the page: every grant of `employees.view` (a role, a group of roles, a group of people, one person)
 * gets the new key at the same reach, with no list of its own, which means every detail (what the page showed until now). Only a grant that lacks the key is given it.
 */
export class EmployeesOpenKey1795600000000 implements MigrationInterface {
    name = 'EmployeesOpenKey1795600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [table, holder] of Object.entries(TABLES)) {
            await queryRunner.query(`
                INSERT INTO "${table}" ("${holder}", "permission_key", "scope", "fields")
                SELECT p."${holder}", 'employees.open', p."scope", NULL FROM "${table}" p
                WHERE p."permission_key" = 'employees.view'
                AND NOT EXISTS (SELECT 1 FROM "${table}" x WHERE x."${holder}" = p."${holder}" AND x."permission_key" = 'employees.open')`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of Object.keys(TABLES)) await queryRunner.query(`DELETE FROM "${table}" WHERE "permission_key" = 'employees.open'`);
    }

}
