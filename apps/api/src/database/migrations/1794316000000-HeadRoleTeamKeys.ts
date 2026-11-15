import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The head role of every unit gets more team keys at `subtree` (standing rule 17): the task tags (category) page and its add / edit / delete,
 * assigning tasks to the team, and editing the people of the unit and below (details, photo, resend the invitation, reset the authenticator). Only keys a head role lacks are inserted, so a key an administrator
 * withdrew from a role is not given back by a later run of a different migration.
 */
export class HeadRoleTeamKeys1794316000000 implements MigrationInterface {
    name = 'HeadRoleTeamKeys1794316000000'

    private readonly keys = [
        'tasks.tags_view', 'tasks.tag_create', 'tasks.tag_update', 'tasks.tag_delete', 'tasks.assign',
        'employees.update', 'employees.photo_update', 'employees.resend_invite', 'employees.reset_authenticator',
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(): Promise<void> {
        // Nothing to undo: `up` leaves a key a head role already had untouched, so a delete here could not tell the keys it added from the ones an
        // administrator had given, and would take those away (review of PR 91).
    }
}
