import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The sign-in account carries the employee's Arabic full name (shown in the header) and personal phone (used for SMS). Edits used to change only the
 * employee record, so existing accounts drifted; this brings them back in line once. From now on the employee service keeps them equal.
 */
export class SyncUsersFromEmployees1794317000000 implements MigrationInterface {
    name = 'SyncUsersFromEmployees1794317000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE users u SET name = e.full_name, updated_at = now() FROM employees e WHERE e.user_id = u.id AND e.full_name <> u.name`);
        await queryRunner.query(`UPDATE users u SET phone = e.personal_phone, updated_at = now() FROM employees e WHERE e.user_id = u.id AND e.personal_phone IS NOT NULL AND u.phone IS DISTINCT FROM e.personal_phone`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: the previous values were stale copies.
    }
}
