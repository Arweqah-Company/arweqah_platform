import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskComments1793181755399 implements MigrationInterface {
    name = 'TaskComments1793181755399'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_comments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid NOT NULL, "author_user_id" uuid NOT NULL, "parent_id" uuid, "reply_to_user_id" uuid, "body" text NOT NULL DEFAULT '', "edited_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by_user_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_comments_task" ON "task_comments"  ("task_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "task_comment_files" ("comment_id" uuid NOT NULL, "file_id" uuid NOT NULL, CONSTRAINT "PK_3f7c8d5b618449a3224ac6a958c" PRIMARY KEY ("comment_id", "file_id"))`);
        await queryRunner.query(`CREATE TABLE "task_comment_mentions" ("comment_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_4535560d674f66f29679232b180" PRIMARY KEY ("comment_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_comment_mentions_user" ON "task_comment_mentions"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "task_comment_rules" ("company_id" uuid NOT NULL, "relation" character varying(20) NOT NULL, "action" character varying(20) NOT NULL, "allowed" boolean NOT NULL, CONSTRAINT "PK_5821390351ca7888289adefd4cb" PRIMARY KEY ("company_id", "relation", "action"))`);
        await queryRunner.query(`ALTER TABLE "task_policies" ADD "comment_max_files" integer NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "task_policies" ADD "comment_edit_minutes" integer NOT NULL DEFAULT '15'`);
        await queryRunner.query(`ALTER TABLE "task_policies" ADD "comment_lock_days" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_tag_status" ON "tasks"  ("tag_id", "status") `);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_author" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_parent" FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_files" ADD CONSTRAINT "FK_task_comment_files_comment" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_files" ADD CONSTRAINT "FK_task_comment_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_mentions" ADD CONSTRAINT "FK_task_comment_mentions_comment" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_mentions" ADD CONSTRAINT "FK_task_comment_mentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_rules" ADD CONSTRAINT "FK_task_comment_rules_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment_rules" DROP CONSTRAINT "FK_task_comment_rules_company"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mentions" DROP CONSTRAINT "FK_task_comment_mentions_user"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mentions" DROP CONSTRAINT "FK_task_comment_mentions_comment"`);
        await queryRunner.query(`ALTER TABLE "task_comment_files" DROP CONSTRAINT "FK_task_comment_files_file"`);
        await queryRunner.query(`ALTER TABLE "task_comment_files" DROP CONSTRAINT "FK_task_comment_files_comment"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_parent"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_author"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_task"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_tag_status"`);
        await queryRunner.query(`ALTER TABLE "task_policies" DROP COLUMN "comment_lock_days"`);
        await queryRunner.query(`ALTER TABLE "task_policies" DROP COLUMN "comment_edit_minutes"`);
        await queryRunner.query(`ALTER TABLE "task_policies" DROP COLUMN "comment_max_files"`);
        await queryRunner.query(`DROP TABLE "task_comment_rules"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_comment_mentions_user"`);
        await queryRunner.query(`DROP TABLE "task_comment_mentions"`);
        await queryRunner.query(`DROP TABLE "task_comment_files"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_comments_task"`);
        await queryRunner.query(`DROP TABLE "task_comments"`);
    }

}
