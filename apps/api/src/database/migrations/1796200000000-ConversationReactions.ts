import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Editing one's own ticket reply and reacting to replies (FR-205, FR-206): `ticket_events.edited_at`, the shared table of reactions on
 * ticket replies and task comments, and the three keys (`tickets.reply_edit`, `tickets.reply_react`, `tasks.comment_react`, scope `all`)
 * for the automatic roles «everyone» and «node_head» (standing rule 17), only where a role lacks them.
 */
export class ConversationReactions1796200000000 implements MigrationInterface {
    name = 'ConversationReactions1796200000000'

    private readonly keys = ['tickets.reply_edit', 'tickets.reply_react', 'tasks.comment_react'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "conversation_reactions" ("target_type" character varying(20) NOT NULL, "target_id" uuid NOT NULL, "user_id" uuid NOT NULL, "reaction" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_conversation_reactions" PRIMARY KEY ("target_type", "target_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_conversation_reactions_target" ON "conversation_reactions"  ("target_type", "target_id") `);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD "edited_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "conversation_reactions" ADD CONSTRAINT "FK_conversation_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`, [this.keys]);
        await queryRunner.query(`ALTER TABLE "conversation_reactions" DROP CONSTRAINT "FK_conversation_reactions_user"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP COLUMN "edited_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_conversation_reactions_target"`);
        await queryRunner.query(`DROP TABLE "conversation_reactions"`);
    }

}
