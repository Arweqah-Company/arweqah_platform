import { MigrationInterface, QueryRunner } from "typeorm";

export class Tickets1792737333662 implements MigrationInterface {
    name = 'Tickets1792737333662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_desks" ("org_node_id" uuid NOT NULL, "reception_status" character varying(10) NOT NULL DEFAULT 'stopped', "description_ar" text, "description_en" text, "accepts_personal" boolean NOT NULL DEFAULT false, "default_due_days" integer NOT NULL DEFAULT '3', "min_lead_days" integer NOT NULL DEFAULT '0', "auto_close_days" integer NOT NULL DEFAULT '4', "reopen_window_days" integer NOT NULL DEFAULT '7', "stale_after_days" integer NOT NULL DEFAULT '14', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_450f548f2df6b3faf199fdb30ad" PRIMARY KEY ("org_node_id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_types" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "desk_id" uuid NOT NULL, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description_ar" text, "description_en" text, "default_assignee_user_id" uuid, "due_days" integer, "is_personal" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_5510ce7e18a4edc648c9fbfc283" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_types_desk" ON "ticket_types"  ("desk_id") `);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "number" BIGSERIAL NOT NULL, "sender_user_id" uuid NOT NULL, "desk_id" uuid NOT NULL, "type_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "details" text NOT NULL DEFAULT '', "priority" smallint NOT NULL DEFAULT '0', "needed_by" date NOT NULL, "assignee_user_id" uuid, "is_personal" boolean NOT NULL DEFAULT false, "status" character varying(20) NOT NULL DEFAULT 'open', "close_reason" character varying(20), "first_response_at" TIMESTAMP WITH TIME ZONE, "close_requested_at" TIMESTAMP WITH TIME ZONE, "closed_at" TIMESTAMP WITH TIME ZONE, "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reopen_count" integer NOT NULL DEFAULT '0', "stale_notified_at" TIMESTAMP WITH TIME ZONE, "revision" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tickets_number" ON "tickets"  ("number") `);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_sender" ON "tickets"  ("sender_user_id") `);
        await queryRunner.query(`CREATE TABLE "ticket_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "ticket_id" uuid NOT NULL, "type" character varying(30) NOT NULL, "actor_user_id" uuid, "body" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d61d07653b492eca67f9bad8ec2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_events_ticket" ON "ticket_events"  ("ticket_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "ticket_attachments" ("event_id" uuid NOT NULL, "file_id" uuid NOT NULL, CONSTRAINT "PK_7a11bb7ee6c297eb96a854eb9c0" PRIMARY KEY ("event_id", "file_id"))`);
        await queryRunner.query(`ALTER TABLE "ticket_desks" ADD CONSTRAINT "FK_ticket_desks_node" FOREIGN KEY ("org_node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD CONSTRAINT "FK_ticket_types_desk" FOREIGN KEY ("desk_id") REFERENCES "ticket_desks"("org_node_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_types" ADD CONSTRAINT "FK_ticket_types_assignee" FOREIGN KEY ("default_assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_desk" FOREIGN KEY ("desk_id") REFERENCES "ticket_desks"("org_node_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_type" FOREIGN KEY ("type_id") REFERENCES "ticket_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sender" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_assignee" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_ticket_events_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_ticket_events_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" ADD CONSTRAINT "FK_ticket_attachments_event" FOREIGN KEY ("event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" ADD CONSTRAINT "FK_ticket_attachments_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_attachments" DROP CONSTRAINT "FK_ticket_attachments_file"`);
        await queryRunner.query(`ALTER TABLE "ticket_attachments" DROP CONSTRAINT "FK_ticket_attachments_event"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_ticket_events_actor"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_ticket_events_ticket"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_assignee"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_sender"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_type"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_desk"`);
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP CONSTRAINT "FK_ticket_types_assignee"`);
        await queryRunner.query(`ALTER TABLE "ticket_types" DROP CONSTRAINT "FK_ticket_types_desk"`);
        await queryRunner.query(`ALTER TABLE "ticket_desks" DROP CONSTRAINT "FK_ticket_desks_node"`);
        await queryRunner.query(`DROP TABLE "ticket_attachments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_events_ticket"`);
        await queryRunner.query(`DROP TABLE "ticket_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_sender"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tickets_number"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_types_desk"`);
        await queryRunner.query(`DROP TABLE "ticket_types"`);
        await queryRunner.query(`DROP TABLE "ticket_desks"`);
    }

}
