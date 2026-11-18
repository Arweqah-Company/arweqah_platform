import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Add followers to a task and remove them» (`tasks.followers_manage`, FR-163): the Employee role holds it at `own` (their own tasks and the ones they gave),
 * the head role of every unit at `subtree` (standing rule 17). Only roles that lack it get it; no table changes.
 */
export class TaskFollowersManageKey1794989900000 implements MigrationInterface {
    name = 'TaskFollowersManageKey1794989900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tasks.followers_manage', CASE WHEN r.auto_rule = 'node_head' THEN 'subtree' ELSE 'own' END FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tasks.followers_manage')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = 'tasks.followers_manage'`);
    }
}
