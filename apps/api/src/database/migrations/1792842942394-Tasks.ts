import { MigrationInterface, QueryRunner } from "typeorm";

export class Tasks1792842942394 implements MigrationInterface {
    name = 'Tasks1792842942394'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_tags" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "org_node_id" uuid NOT NULL, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7b47a7628547c0976415988d3cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_tags_node" ON "task_tags"  ("org_node_id") `);
        await queryRunner.query(`CREATE TABLE "task_policies" ("company_id" uuid NOT NULL, "objection_working_days" integer NOT NULL DEFAULT '3', "stale_days" integer NOT NULL DEFAULT '30', "backdate_days" integer NOT NULL DEFAULT '7', "urgent_days" integer NOT NULL DEFAULT '2', "reminder_days_before" integer NOT NULL DEFAULT '1', "digest_weekday" integer NOT NULL DEFAULT '0', "standalone_retention_days" integer NOT NULL DEFAULT '30', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2cfe64a74faedf525a4a6b83274" PRIMARY KEY ("company_id"))`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "number" BIGSERIAL NOT NULL, "company_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL DEFAULT '', "assignee_user_id" uuid NOT NULL, "creator_user_id" uuid NOT NULL, "reviewer_user_id" uuid, "approver_user_id" uuid, "status" character varying(20) NOT NULL DEFAULT 'todo', "priority" character varying(10) NOT NULL DEFAULT 'medium', "due_date" date NOT NULL, "estimate_minutes" integer, "tag_id" uuid, "urgent_manual" boolean NOT NULL DEFAULT false, "needs_review" boolean NOT NULL DEFAULT false, "recurrence" character varying(10) NOT NULL DEFAULT 'none', "recurrence_end" date, "recurrence_parent_id" uuid, "source" character varying(12) NOT NULL DEFAULT 'standalone', "project_id" uuid, "ticket_id" uuid, "completed_at" TIMESTAMP WITH TIME ZONE, "completed_on" date, "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "reminded_at" TIMESTAMP WITH TIME ZONE, "overdue_notified_at" TIMESTAMP WITH TIME ZONE, "estimate_notified_at" TIMESTAMP WITH TIME ZONE, "revision" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tasks_number" ON "tasks"  ("number") `);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_creator" ON "tasks"  ("creator_user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_due" ON "tasks"  ("due_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_status_activity" ON "tasks"  ("status", "last_activity_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_assignee_status" ON "tasks"  ("assignee_user_id", "status") `);
        await queryRunner.query(`CREATE TABLE "task_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid NOT NULL, "type" character varying(30) NOT NULL, "actor_user_id" uuid, "from_status" character varying(20), "to_status" character varying(20), "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5ad150da47d65e2346ff40169cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_events_task" ON "task_events"  ("task_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "task_followers" ("task_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee4e637a9486641b61337d9bde3" PRIMARY KEY ("task_id", "user_id"))`);
        await queryRunner.query(`CREATE TABLE "task_objections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid NOT NULL, "raised_by_user_id" uuid NOT NULL, "reason_code" character varying(30) NOT NULL, "note" text, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'open', "answered_by_user_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_62f576a135c39d4dc9491051c38" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_objections_task" ON "task_objections"  ("task_id", "status") `);
        await queryRunner.query(`CREATE TABLE "task_time_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid NOT NULL, "user_id" uuid NOT NULL, "minutes" integer NOT NULL, "worked_on" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3b8f6977d2b3f7aede7e56bcf40" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_time_entries_task" ON "task_time_entries"  ("task_id") `);
        await queryRunner.query(`ALTER TABLE "task_tags" ADD CONSTRAINT "FK_task_tags_node" FOREIGN KEY ("org_node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_policies" ADD CONSTRAINT "FK_task_policies_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_assignee" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_creator" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_reviewer" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_approver" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_tag" FOREIGN KEY ("tag_id") REFERENCES "task_tags"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_recurrence_parent" FOREIGN KEY ("recurrence_parent_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_events" ADD CONSTRAINT "FK_task_events_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_events" ADD CONSTRAINT "FK_task_events_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_followers" ADD CONSTRAINT "FK_task_followers_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_followers" ADD CONSTRAINT "FK_task_followers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_objections" ADD CONSTRAINT "FK_task_objections_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_objections" ADD CONSTRAINT "FK_task_objections_user" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_time_entries" ADD CONSTRAINT "FK_task_time_entries_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_time_entries" ADD CONSTRAINT "FK_task_time_entries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_time_entries" DROP CONSTRAINT "FK_task_time_entries_user"`);
        await queryRunner.query(`ALTER TABLE "task_time_entries" DROP CONSTRAINT "FK_task_time_entries_task"`);
        await queryRunner.query(`ALTER TABLE "task_objections" DROP CONSTRAINT "FK_task_objections_user"`);
        await queryRunner.query(`ALTER TABLE "task_objections" DROP CONSTRAINT "FK_task_objections_task"`);
        await queryRunner.query(`ALTER TABLE "task_followers" DROP CONSTRAINT "FK_task_followers_user"`);
        await queryRunner.query(`ALTER TABLE "task_followers" DROP CONSTRAINT "FK_task_followers_task"`);
        await queryRunner.query(`ALTER TABLE "task_events" DROP CONSTRAINT "FK_task_events_actor"`);
        await queryRunner.query(`ALTER TABLE "task_events" DROP CONSTRAINT "FK_task_events_task"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_ticket"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_recurrence_parent"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_tag"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_approver"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_reviewer"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_creator"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assignee"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_company"`);
        await queryRunner.query(`ALTER TABLE "task_policies" DROP CONSTRAINT "FK_task_policies_company"`);
        await queryRunner.query(`ALTER TABLE "task_tags" DROP CONSTRAINT "FK_task_tags_node"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_time_entries_task"`);
        await queryRunner.query(`DROP TABLE "task_time_entries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_objections_task"`);
        await queryRunner.query(`DROP TABLE "task_objections"`);
        await queryRunner.query(`DROP TABLE "task_followers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_events_task"`);
        await queryRunner.query(`DROP TABLE "task_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_assignee_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_status_activity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_due"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_creator"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tasks_number"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TABLE "task_policies"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_tags_node"`);
        await queryRunner.query(`DROP TABLE "task_tags"`);
    }

}
