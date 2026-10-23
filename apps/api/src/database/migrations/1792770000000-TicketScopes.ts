import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ticket permissions have scopes now: everyone sees and handles only their own tickets at first, so the Employee role's
 * grants of viewing and replying are narrowed from "all" to "own", and the key that meant "every department" is gone
 * (the setup and figures keys carry that scope).
 */
export class TicketScopes1792770000000 implements MigrationInterface {
    name = 'TicketScopes1792770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "role_permissions" SET "scope" = 'own' WHERE "permission_key" IN ('tickets.view', 'tickets.reply') AND "scope" = 'all'
            AND "role_id" IN (SELECT "id" FROM "roles" WHERE "is_system" AND "name_en" = 'Employee')`);
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_key" = 'tickets.administer'`);
    }

    public async down(): Promise<void> {
        // The previous scopes cannot be rebuilt: nobody chose them.
    }
}
