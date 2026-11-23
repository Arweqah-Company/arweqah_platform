import { MigrationInterface, QueryRunner } from "typeorm";

const WRITER_ROLES = [
    { channel: 'hr', nameAr: 'كاتب تعاميم — الموارد البشرية', nameEn: 'Notice writer — Human resources', channelAr: 'قناة الموارد البشرية', channelEn: 'Human resources channel' },
    { channel: 'corporate_comms', nameAr: 'كاتب تعاميم — التواصل المؤسسي', nameEn: 'Notice writer — Corporate communications', channelAr: 'قناة التواصل المؤسسي', channelEn: 'Corporate communications channel' },
];
/** What a channel writer holds (own): writing, sending, archiving, new versions and the report of their notices. Never approving or pinning. */
const WRITER_KEYS = ['notices.manage_view', 'notices.create', 'notices.edit', 'notices.delete', 'notices.submit', 'notices.archive', 'notices.revise', 'notices.revise_cancel', 'notices.ack_report', 'notices.ack_export', 'notices.export'];
const EMPLOYEE_KEYS = ['notices.view', 'notices.acknowledge', 'notices.export_mine'];
/** The head role of every unit (standing rule 17): the unit and below. */
const HEAD_KEYS = ['notices.manage_view', 'notices.approve_view', 'notices.approve', 'notices.reject', 'notices.archive', 'notices.ack_report', 'notices.ack_export', 'notices.export', 'notices.channels_view', 'notices.hr_writer_add', 'notices.hr_writer_remove', 'notices.comms_writer_add', 'notices.comms_writer_remove'];

/**
 * Circulars and policies (FR-167 … FR-176): the tables, the two channels with the system role each channel's writers hold (fixed keys), and the new keys in the
 * Employee role and in the existing head roles (only the keys they lack). Idempotent seed part: running it again changes nothing.
 */
export class Notices1795343093493 implements MigrationInterface {
    name = 'Notices1795343093493'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notice_channels" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(20) NOT NULL, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "writer_role_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_daf557cb9fc079764f80762bd99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notice_channels_code" ON "notice_channels"  ("code") `);
        await queryRunner.query(`CREATE TABLE "notice_channel_writers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "channel_id" uuid NOT NULL, "user_id" uuid NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_notice_channel_writers" UNIQUE ("channel_id", "user_id"), CONSTRAINT "PK_3b8a79025a86579113b10dc4051" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notice_channel_writers_user" ON "notice_channel_writers"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "notices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "channel_id" uuid NOT NULL, "kind" character varying(15) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "author_id" uuid NOT NULL, "author_unit_id" uuid, "approver_user_id" uuid, "submitted_at" TIMESTAMP WITH TIME ZONE, "approved_at" TIMESTAMP WITH TIME ZONE, "reject_reason" text, "publish_on" date, "published_at" TIMESTAMP WITH TIME ZONE, "is_pinned" boolean NOT NULL DEFAULT false, "pinned_at" TIMESTAMP WITH TIME ZONE, "archived_at" TIMESTAMP WITH TIME ZONE, "revision" integer NOT NULL DEFAULT '1', "current_version" integer NOT NULL DEFAULT '0', "batches_done" integer NOT NULL DEFAULT '0', "delivery_completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_3eb18c29da25d6935fcbe584237" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notices_pinned" ON "notices"  ("is_pinned") WHERE is_pinned = true`);
        await queryRunner.query(`CREATE INDEX "IDX_notices_author_unit" ON "notices"  ("author_unit_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_notices_author" ON "notices"  ("author_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_notices_channel" ON "notices"  ("channel_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_notices_status" ON "notices"  ("status") `);
        await queryRunner.query(`CREATE TABLE "notice_versions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "notice_id" uuid NOT NULL, "version" integer NOT NULL, "title_ar" character varying(200) NOT NULL, "title_en" character varying(200), "body" text NOT NULL, "is_draft" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_notice_versions" UNIQUE ("notice_id", "version"), CONSTRAINT "PK_dd6caee5ab55674c49d1c20e66f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notice_audiences" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "notice_id" uuid NOT NULL, "version" integer NOT NULL, "type" character varying(15) NOT NULL, "ref_id" uuid, "include_below" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_107b290bacba45bba3e9538b2b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notice_audiences_notice" ON "notice_audiences"  ("notice_id", "version") `);
        await queryRunner.query(`CREATE TABLE "notice_recipients" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "notice_id" uuid NOT NULL, "user_id" uuid NOT NULL, "delivered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "read_at" TIMESTAMP WITH TIME ZONE, "acknowledged_at" TIMESTAMP WITH TIME ZONE, "acknowledged_version" integer, "joined_after_publish" boolean NOT NULL DEFAULT false, "notified_version" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_notice_recipients" UNIQUE ("notice_id", "user_id"), CONSTRAINT "PK_f9718517aad7cbcc66d56557502" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notice_recipients_user" ON "notice_recipients"  ("user_id", "acknowledged_at") `);
        await queryRunner.query(`CREATE TABLE "notice_attachments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "notice_id" uuid NOT NULL, "version" integer NOT NULL, "file_id" uuid NOT NULL, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_f1cba526469d2ddf3852990247c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notice_attachments_notice" ON "notice_attachments"  ("notice_id", "version") `);
        await queryRunner.query(`CREATE TABLE "notice_settings" ("id" smallint NOT NULL, "batch_size" integer NOT NULL DEFAULT '500', "batch_interval_minutes" integer NOT NULL DEFAULT '5', "updated_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aa728f4f5f998a51321e0928c08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notice_channels" ADD CONSTRAINT "FK_notice_channels_role" FOREIGN KEY ("writer_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_channel_writers" ADD CONSTRAINT "FK_notice_channel_writers_channel" FOREIGN KEY ("channel_id") REFERENCES "notice_channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_channel_writers" ADD CONSTRAINT "FK_notice_channel_writers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_notices_channel" FOREIGN KEY ("channel_id") REFERENCES "notice_channels"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_notices_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_notices_author_unit" FOREIGN KEY ("author_unit_id") REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_notices_approver" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_versions" ADD CONSTRAINT "FK_notice_versions_notice" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_audiences" ADD CONSTRAINT "FK_notice_audiences_notice" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_recipients" ADD CONSTRAINT "FK_notice_recipients_notice" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_recipients" ADD CONSTRAINT "FK_notice_recipients_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_attachments" ADD CONSTRAINT "FK_notice_attachments_notice" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_attachments" ADD CONSTRAINT "FK_notice_attachments_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notice_settings" ADD CONSTRAINT "FK_notice_settings_user" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await this.seed(queryRunner);
    }

    private async seed(queryRunner: QueryRunner): Promise<void> {
        for (const w of WRITER_ROLES) {
            await queryRunner.query(`
                INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule)
                SELECT $1::varchar, $2::varchar, true, 'auto', 'notice_writer'
                WHERE NOT EXISTS (SELECT 1 FROM roles WHERE auto_rule = 'notice_writer' AND name_en = $2)`, [w.nameAr, w.nameEn]);
            await queryRunner.query(`
                INSERT INTO role_permissions (role_id, permission_key, scope)
                SELECT r.id, k.key, 'own' FROM roles r CROSS JOIN unnest($2::text[]) AS k(key)
                WHERE r.auto_rule = 'notice_writer' AND r.name_en = $1
                AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [w.nameEn, WRITER_KEYS]);
            await queryRunner.query(`
                INSERT INTO notice_channels (code, name_ar, name_en, writer_role_id, is_active)
                SELECT $1::varchar, $2::varchar, $3::varchar, r.id, true FROM roles r WHERE r.auto_rule = 'notice_writer' AND r.name_en = $4
                ON CONFLICT (code) DO NOTHING`, [w.channel, w.channelAr, w.channelEn, w.nameEn]);
        }
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'own' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [EMPLOYEE_KEYS]);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'subtree' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule = 'node_head'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`, [HEAD_KEYS]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM notices`);
        await queryRunner.query(`DELETE FROM notice_channels`);
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key LIKE 'notices.%'`);
        await queryRunner.query(`DELETE FROM roles WHERE auto_rule = 'notice_writer'`);
        await queryRunner.query(`ALTER TABLE "notice_settings" DROP CONSTRAINT "FK_notice_settings_user"`);
        await queryRunner.query(`ALTER TABLE "notice_attachments" DROP CONSTRAINT "FK_notice_attachments_file"`);
        await queryRunner.query(`ALTER TABLE "notice_attachments" DROP CONSTRAINT "FK_notice_attachments_notice"`);
        await queryRunner.query(`ALTER TABLE "notice_recipients" DROP CONSTRAINT "FK_notice_recipients_user"`);
        await queryRunner.query(`ALTER TABLE "notice_recipients" DROP CONSTRAINT "FK_notice_recipients_notice"`);
        await queryRunner.query(`ALTER TABLE "notice_audiences" DROP CONSTRAINT "FK_notice_audiences_notice"`);
        await queryRunner.query(`ALTER TABLE "notice_versions" DROP CONSTRAINT "FK_notice_versions_notice"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_notices_approver"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_notices_author_unit"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_notices_author"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_notices_channel"`);
        await queryRunner.query(`ALTER TABLE "notice_channel_writers" DROP CONSTRAINT "FK_notice_channel_writers_user"`);
        await queryRunner.query(`ALTER TABLE "notice_channel_writers" DROP CONSTRAINT "FK_notice_channel_writers_channel"`);
        await queryRunner.query(`ALTER TABLE "notice_channels" DROP CONSTRAINT "FK_notice_channels_role"`);
        await queryRunner.query(`DROP TABLE "notice_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notice_attachments_notice"`);
        await queryRunner.query(`DROP TABLE "notice_attachments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notice_recipients_user"`);
        await queryRunner.query(`DROP TABLE "notice_recipients"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notice_audiences_notice"`);
        await queryRunner.query(`DROP TABLE "notice_audiences"`);
        await queryRunner.query(`DROP TABLE "notice_versions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notices_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notices_channel"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notices_author"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notices_author_unit"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notices_pinned"`);
        await queryRunner.query(`DROP TABLE "notices"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notice_channel_writers_user"`);
        await queryRunner.query(`DROP TABLE "notice_channel_writers"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notice_channels_code"`);
        await queryRunner.query(`DROP TABLE "notice_channels"`);
    }

}
