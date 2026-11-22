import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Switch a welcome-tour step on or off» now has its own key (`tour.settings_toggle`), apart from editing the wording (`tour.settings_edit`).
 * Whoever held the edit key keeps the switch (same scope), so nobody loses a button; no table changes.
 */
export class TourSettingsToggleKey1795200000000 implements MigrationInterface {
    name = 'TourSettingsToggleKey1795200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT p.role_id, 'tour.settings_toggle', p.scope FROM role_permissions p
            WHERE p.permission_key = 'tour.settings_edit'
            AND NOT EXISTS (SELECT 1 FROM role_permissions t WHERE t.role_id = p.role_id AND t.permission_key = 'tour.settings_toggle')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key = 'tour.settings_toggle'`);
    }
}
