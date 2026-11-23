import { MigrationInterface, QueryRunner } from "typeorm";

/** Scopes from the narrowest to the widest (the order of `SCOPE_ORDER` in `packages/shared`), to keep the widest when two old keys merge into one. */
const SCOPE_ORDER = ['own', 'unit', 'subtree:1', 'subtree:2', 'subtree:3', 'subtree:4', 'subtree:5', 'subtree', 'company', 'all'];
/** The four per-channel writer keys become two keys whose scope is the channel's owning unit. */
const MERGES = [
    { into: 'notices.writer_add', from: ['notices.hr_writer_add', 'notices.comms_writer_add'] },
    { into: 'notices.writer_remove', from: ['notices.hr_writer_remove', 'notices.comms_writer_remove'] },
];
/** Where each tables holds a grant: its owner column and the extra columns that move with it. */
const GRANT_TABLES = [
    { table: 'role_permissions', owner: 'role_id', extra: [] as string[] },
    { table: 'role_group_permissions', owner: 'group_id', extra: [] as string[] },
    { table: 'user_group_permissions', owner: 'group_id', extra: [] as string[] },
    { table: 'user_permissions', owner: 'user_id', extra: ['expires_at', 'granted_by'] },
];
/** The head role of every unit (standing rule 17): the keys of the unit and below. */
const HEAD_KEYS = ['notices.writer_add', 'notices.writer_remove', 'notices.channel_add', 'notices.channel_remove'];
/** The unit each first channel belongs to, the best match first; none found = a company-wide channel (a platform administrator manages it). */
const UNITS = [
    { code: 'hr', names: ['إدارة الموارد البشرية', 'Human Resources Department', 'قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section'] },
    { code: 'corporate_comms', names: ['إدارة التواصل المؤسسي', 'Corporate Communications Department'] },
];

/**
 * Publishing channels for any unit (FR-177): a channel gets an owning unit (`org_node_id`, never changed), its code a slug of up to 60 characters and its names a unique
 * index; the two first channels are tied to their units when the structure has them; the four per-channel writer keys become `notices.writer_add` / `notices.writer_remove`
 * (every grant moves: roles, groups of roles, groups of people and personal exceptions, the widest scope winning); the head role of every unit gets the four keys it lacks.
 * Idempotent: running the data part again changes nothing.
 */
export class NoticeChannelsPerUnit1795400000000 implements MigrationInterface {
    name = 'NoticeChannelsPerUnit1795400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notice_channels" ALTER COLUMN "code" TYPE character varying(60)`);
        await queryRunner.query(`ALTER TABLE "notice_channels" ADD "org_node_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_notice_channels_org_node" ON "notice_channels"  ("org_node_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notice_channels_name_ar" ON "notice_channels"  ("name_ar") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notice_channels_name_en" ON "notice_channels"  ("name_en") `);
        await queryRunner.query(`ALTER TABLE "notice_channels" ADD CONSTRAINT "FK_notice_channels_org_node" FOREIGN KEY ("org_node_id") REFERENCES "org_nodes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await this.tieToUnits(queryRunner);
        await this.mergeWriterKeys(queryRunner);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [HEAD_KEYS]);
    }

    private async tieToUnits(queryRunner: QueryRunner): Promise<void> {
        for (const u of UNITS) {
            await queryRunner.query(`
                UPDATE notice_channels SET org_node_id = (
                    SELECT n.id FROM org_nodes n JOIN org_node_translations t ON t.org_node_id = n.id
                    WHERE n.deleted_at IS NULL AND t.name = ANY($2::text[])
                    ORDER BY array_position($2::text[], t.name), n.sort_order, n.id LIMIT 1)
                WHERE code = $1 AND org_node_id IS NULL`, [u.code, u.names]);
        }
    }

    private async mergeWriterKeys(queryRunner: QueryRunner): Promise<void> {
        for (const { table, owner, extra } of GRANT_TABLES) {
            for (const merge of MERGES) {
                const carried = extra.map((c) => `, (array_agg(${c} ORDER BY array_position($3::text[], scope) DESC))[1]`).join('');
                const columns = extra.map((c) => `, ${c}`).join('');
                await queryRunner.query(`
                    INSERT INTO ${table} (${owner}, permission_key, scope${columns})
                    SELECT ${owner}, $1, (array_agg(scope ORDER BY array_position($3::text[], scope) DESC))[1]${carried}
                    FROM ${table} WHERE permission_key = ANY($2::text[]) GROUP BY ${owner}
                    ON CONFLICT (${owner}, permission_key) DO NOTHING`, [merge.into, merge.from, SCOPE_ORDER]);
                await queryRunner.query(`DELETE FROM ${table} WHERE permission_key = ANY($1::text[])`, [merge.from]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [['notices.hr_writer_add', 'notices.hr_writer_remove', 'notices.comms_writer_add', 'notices.comms_writer_remove']]);
        for (const { table } of GRANT_TABLES) {
            await queryRunner.query(`DELETE FROM ${table} WHERE permission_key = ANY($1::text[])`, [['notices.writer_add', 'notices.writer_remove', 'notices.channel_add', 'notices.channel_remove']]);
        }
        await queryRunner.query(`DELETE FROM notices WHERE channel_id IN (SELECT id FROM notice_channels WHERE code NOT IN ('hr', 'corporate_comms'))`);
        await queryRunner.query(`DELETE FROM notice_channels WHERE code NOT IN ('hr', 'corporate_comms')`);
        await queryRunner.query(`ALTER TABLE "notice_channels" DROP CONSTRAINT "FK_notice_channels_org_node"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notice_channels_name_en"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notice_channels_name_ar"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notice_channels_org_node"`);
        await queryRunner.query(`ALTER TABLE "notice_channels" DROP COLUMN "org_node_id"`);
        await queryRunner.query(`ALTER TABLE "notice_channels" ALTER COLUMN "code" TYPE character varying(20)`);
    }
}
