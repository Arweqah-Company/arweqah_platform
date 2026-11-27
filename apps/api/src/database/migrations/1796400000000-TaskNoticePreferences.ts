import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The task summary and reminders by e-mail and notice (FR-215…FR-218): one row per person who changed the defaults
 * (`task_notice_preferences`), the «due today» reminder mark on a task (`tasks.due_day_notified_at`), and the key
 * `tasks.notice_settings` (scope `all`) for the automatic roles «everyone» and «node_head» (standing rule 17), only where a role lacks it.
 */
export class TaskNoticePreferences1796400000000 implements MigrationInterface {
    name = 'TaskNoticePreferences1796400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_notice_preferences" ("user_id" uuid NOT NULL, "channel" character varying(10) NOT NULL DEFAULT 'in_app', "digest_enabled" boolean NOT NULL DEFAULT true, "digest_hour" smallint NOT NULL DEFAULT '8', "reminders_enabled" boolean NOT NULL DEFAULT true, "digest_last_sent_on" date, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_task_notice_preferences" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "due_day_notified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_notice_preferences" ADD CONSTRAINT "FK_task_notice_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tasks.notice_settings', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tasks.notice_settings')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = 'tasks.notice_settings'`);
        await queryRunner.query(`ALTER TABLE "task_notice_preferences" DROP CONSTRAINT "FK_task_notice_preferences_user"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "due_day_notified_at"`);
        await queryRunner.query(`DROP TABLE "task_notice_preferences"`);
    }

}
