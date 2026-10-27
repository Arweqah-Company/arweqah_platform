import { MigrationInterface, QueryRunner } from "typeorm";

export class MessageTemplates1793107601133 implements MigrationInterface {
    name = 'MessageTemplates1793107601133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "message_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "kind" character varying(20) NOT NULL, "key" character varying(80) NOT NULL, "content" jsonb, "pending" jsonb, "pending_by" uuid, "pending_at" TIMESTAMP WITH TIME ZONE, "updated_by" uuid, CONSTRAINT "PK_9ac2bd9635be662d183f314947d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_message_template" ON "message_templates"  ("kind", "key") `);
        await queryRunner.query(`CREATE TABLE "template_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "kind" character varying(20) NOT NULL, "require_approval" boolean NOT NULL DEFAULT false, "updated_by" uuid, CONSTRAINT "PK_302c199ce43e3fa4de2874be6ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_template_setting_kind" ON "template_settings"  ("kind") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_template_setting_kind"`);
        await queryRunner.query(`DROP TABLE "template_settings"`);
        await queryRunner.query(`DROP INDEX "public"."uq_message_template"`);
        await queryRunner.query(`DROP TABLE "message_templates"`);
    }

}
