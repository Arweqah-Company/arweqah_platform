import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailLogs1792590956302 implements MigrationInterface {
    name = 'EmailLogs1792590956302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "to_email" character varying(254) NOT NULL, "subject" character varying(300) NOT NULL, "purpose" character varying(30) NOT NULL DEFAULT 'other', "status" character varying(20) NOT NULL DEFAULT 'pending', "error" text, "message_id" character varying(300), "provider_response" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_999382218924e953a790d340571" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54a566a74b4b72d9548a803883" ON "email_logs"  ("to_email") `);
        await queryRunner.query(`CREATE INDEX "IDX_23826d0c5be7cadcd5eeb88708" ON "email_logs"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_8fa8c951a0652c1ec745d79492" ON "email_logs"  ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8fa8c951a0652c1ec745d79492"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23826d0c5be7cadcd5eeb88708"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54a566a74b4b72d9548a803883"`);
        await queryRunner.query(`DROP TABLE "email_logs"`);
    }

}
