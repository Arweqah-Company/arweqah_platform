import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Answers to replies and @ mentions in tickets (FR-128): `ticket_events.parent_event_id` / `reply_to_user_id`, the table of mentions,
 * and the two new keys (`tickets.comment_reply`, `tickets.comment_mention`, scope `all`) for the automatic roles «everyone» and «node_head»
 * (standing rule 17), only where a role lacks them.
 */
export class TicketReplyMentions1794313000000 implements MigrationInterface {
    name = 'TicketReplyMentions1794313000000'

    private readonly keys = ['tickets.comment_reply', 'tickets.comment_mention'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD "parent_event_id" uuid`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD "reply_to_user_id" uuid`);
        await queryRunner.query(`CREATE TABLE "ticket_event_mentions" ("event_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_ticket_event_mentions" PRIMARY KEY ("event_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_event_mentions_user" ON "ticket_event_mentions" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_ticket_events_parent" FOREIGN KEY ("parent_event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_ticket_events_reply_to" FOREIGN KEY ("reply_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_event_mentions" ADD CONSTRAINT "FK_ticket_event_mentions_event" FOREIGN KEY ("event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_event_mentions" ADD CONSTRAINT "FK_ticket_event_mentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`, [this.keys]);
        await queryRunner.query(`ALTER TABLE "ticket_event_mentions" DROP CONSTRAINT "FK_ticket_event_mentions_user"`);
        await queryRunner.query(`ALTER TABLE "ticket_event_mentions" DROP CONSTRAINT "FK_ticket_event_mentions_event"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_ticket_events_reply_to"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_ticket_events_parent"`);
        await queryRunner.query(`DROP INDEX "IDX_ticket_event_mentions_user"`);
        await queryRunner.query(`DROP TABLE "ticket_event_mentions"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP COLUMN "reply_to_user_id"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP COLUMN "parent_event_id"`);
    }
}
