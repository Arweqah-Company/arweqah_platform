import { MigrationInterface, QueryRunner } from "typeorm";

/** A relation type can limit access (collaborators), and the collaborator base role exists with the own-account permissions only. */
export class CollaboratorBase1793626000000 implements MigrationInterface {
    name = 'CollaboratorBase1793626000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "relation_types" ADD "limited_access" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "relation_types" SET "limited_access" = true WHERE "code" = 'collaborator'`);
        const defaults = JSON.stringify(['profile.view', 'profile.update', 'security.view', 'notifications.view', 'notifications.mark_read']);
        await queryRunner.query(`
            WITH made AS (
                INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule)
                SELECT 'أساس المتعاون', 'Collaborator base', false, 'auto', 'limited_access'
                WHERE NOT EXISTS (SELECT 1 FROM roles WHERE auto_rule = 'limited_access')
                RETURNING id)
            INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, k, 'all' FROM made CROSS JOIN jsonb_array_elements_text($1::jsonb) AS k`, [defaults]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'limited_access'`);
        await queryRunner.query(`ALTER TABLE "relation_types" DROP COLUMN "limited_access"`);
    }

}
