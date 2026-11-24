import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Choose who answers a ticket» (`tickets.choose_handler`) goes into the head role of every unit at `subtree` (standing rule 17): a ticket of a type with
 * several handlers that nobody has taken waits for the head of the unit to pick one. Only a head role that lacks the key is given it.
 */
export class TicketsChooseHandlerKey1795700000000 implements MigrationInterface {
    name = 'TicketsChooseHandlerKey1795700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tickets.choose_handler', 'subtree' FROM roles r
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tickets.choose_handler')`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could not tell the rows this added from the ones an administrator gave.
    }
}
