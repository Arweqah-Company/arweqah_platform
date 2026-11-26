import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Export the ticket list» (`tickets.export`) goes into the head role of every unit (standing rule 17): a leader exports the tickets they see.
 * Only a head role that lacks the key is given it.
 */
export class TicketsExportKey1796000000000 implements MigrationInterface {
    name = 'TicketsExportKey1796000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tickets.export', 'all' FROM roles r
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tickets.export')`);
    }

    public async down(): Promise<void> {
        // Nothing to undo: a delete could not tell the rows this added from the ones an administrator gave.
    }
}
