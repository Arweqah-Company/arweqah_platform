import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Review of PR 91: `SyncUsersFromEmployees` copied a phone only when the employee had one, so an account kept an obsolete number after the
 * employee's phone was cleared. The account's phone follows the record (cleared too): this empties the accounts whose employee has none.
 */
export class SyncClearedPhones1794318000000 implements MigrationInterface {
    name = 'SyncClearedPhones1794318000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE users u SET phone = NULL, updated_at = now() FROM employees e WHERE e.user_id = u.id AND e.personal_phone IS NULL AND u.phone IS NOT NULL`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: the numbers emptied were stale copies.
    }
}
