import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A head role for every unit instead of one per organization level of each company: «قائد قطاع التشغيل وتقديم الخدمات» is the role of that sector,
 * whichever company it sits in. Each unit starts with the permissions its level's role had, and its manager holds it.
 */
export class NodeHeadRoles1793627000000 implements MigrationInterface {
    name = 'NodeHeadRoles1793627000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "org_node_id" uuid`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_org_node" FOREIGN KEY ("org_node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_org_node" ON "roles" ("org_node_id") WHERE org_node_id IS NOT NULL`);
        const name = (lang: string) => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = n.id AND x.lang = '${lang}')`;
        await queryRunner.query(`
            WITH made AS (
                INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, org_node_id)
                SELECT left('قائد ' || coalesce(${name('ar')}, ${name('en')}, ''), 120), left('Head of ' || coalesce(${name('en')}, ${name('ar')}, ''), 120), false, 'auto', 'node_head', n.id
                FROM org_nodes n WHERE n.deleted_at IS NULL
                RETURNING id, org_node_id)
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT made.id, p.permission_key, p.scope FROM made
            JOIN org_nodes n ON n.id = made.org_node_id
            JOIN roles lr ON lr.auto_rule = 'node_head' AND lr.org_level_id = n.org_level_id
            JOIN role_permissions p ON p.role_id = lr.id`);
        await queryRunner.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT DISTINCT e.user_id, r.id FROM org_nodes n JOIN employees e ON e.id = n.manager_id AND e.deleted_at IS NULL
            JOIN roles r ON r.org_node_id = n.id WHERE n.deleted_at IS NULL AND n.is_active ON CONFLICT DO NOTHING`);
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'node_head' AND org_level_id IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roles_org_level"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_org_level"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "org_level_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'node_head'`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "org_level_id" uuid`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_org_level" FOREIGN KEY ("org_level_id") REFERENCES "org_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_org_level" ON "roles" ("org_level_id") WHERE org_level_id IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roles_org_node"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_org_node"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "org_node_id"`);
    }

}
