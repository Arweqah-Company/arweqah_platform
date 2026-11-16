import { MigrationInterface, QueryRunner } from "typeorm";

export class AgentChat1794824368654 implements MigrationInterface {
    name = 'AgentChat1794824368654'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "agent_conversations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "title" character varying(120) NOT NULL, CONSTRAINT "PK_2680ac7af80219a718cf98a1d21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agent_conversations_user" ON "agent_conversations"  ("user_id", "updated_at") `);
        await queryRunner.query(`CREATE TABLE "agent_messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "conversation_id" uuid NOT NULL, "role" character varying(10) NOT NULL, "text" text NOT NULL, "draft" jsonb, "draft_status" character varying(10), "draft_expires_at" TIMESTAMP WITH TIME ZONE, "executed_at" TIMESTAMP WITH TIME ZONE, "result" jsonb, CONSTRAINT "PK_8c7cdeda30e81dba421925df4fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agent_messages_conversation" ON "agent_messages"  ("conversation_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "agent_conversations" ADD CONSTRAINT "FK_4462b0cb7eee3df9ef6c2c03b35" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_messages" ADD CONSTRAINT "FK_274a545386dee5384a4174adfd1" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_messages" DROP CONSTRAINT "FK_274a545386dee5384a4174adfd1"`);
        await queryRunner.query(`ALTER TABLE "agent_conversations" DROP CONSTRAINT "FK_4462b0cb7eee3df9ef6c2c03b35"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_messages_conversation"`);
        await queryRunner.query(`DROP TABLE "agent_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agent_conversations_user"`);
        await queryRunner.query(`DROP TABLE "agent_conversations"`);
    }

}
