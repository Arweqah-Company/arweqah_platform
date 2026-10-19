import { MigrationInterface, QueryRunner } from "typeorm";

export class Foundation1792389936440 implements MigrationInterface {
    name = 'Foundation1792389936440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_key" character varying(100) NOT NULL, "scope" character varying(20) NOT NULL, CONSTRAINT "PK_064de54701f3ac10466efa130a5" PRIMARY KEY ("role_id", "permission_key"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description" character varying(500), "is_system" boolean NOT NULL DEFAULT false, "requires_two_factor" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_placements" ("user_id" uuid NOT NULL, "branch_id" uuid, "department_id" uuid, "team_id" uuid, "manager_id" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fa3ebfc8f7940d554d51c2a5112" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_placements_branch_id" ON "user_placements"  ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_placements_department_id" ON "user_placements"  ("department_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_placements_team_id" ON "user_placements"  ("team_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_placements_manager_id" ON "user_placements"  ("manager_id") `);
        await queryRunner.query(`CREATE TABLE "user_roles" ("user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_roles_role" ON "user_roles"  ("role_id") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid, "action" character varying(80) NOT NULL, "entity_type" character varying(80) NOT NULL, "entity_id" character varying(100), "changes" jsonb, "ip" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_177183f29f438c488b5e8510cd" ON "audit_logs"  ("actor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs"  ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs"  ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs"  ("entity_type", "entity_id") `);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "owner_id" uuid NOT NULL, "storage_key" character varying(200) NOT NULL, "original_name" character varying(200) NOT NULL, "content_type" character varying(100) NOT NULL, "size" integer NOT NULL, CONSTRAINT "UQ_e916afbf2015d561fd0842ff898" UNIQUE ("storage_key"), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4bc1db1f4f34ec9415acd88afd" ON "files"  ("owner_id") `);
        await queryRunner.query(`CREATE TABLE "outbox_messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "topic" character varying(120) NOT NULL, "payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "last_error" text, CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_030ccebb8bfd393befb0ae4314" ON "outbox_messages"  ("published_at", "created_at") `);
        await queryRunner.query(`CREATE TABLE "processed_messages" ("consumer" character varying(120) NOT NULL, "message_id" character varying(100) NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d4853eee97acfc588e49f9290d1" PRIMARY KEY ("consumer", "message_id"))`);
        await queryRunner.query(`CREATE TABLE "scheduled_jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "topic" character varying(120) NOT NULL, "payload" jsonb NOT NULL, "run_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "dedupe_key" character varying(200), "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_119312a5470a95ee9c733a5246d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_72e924cd41713f5c899d49d01d" ON "scheduled_jobs"  ("dedupe_key") WHERE status = 'pending' AND dedupe_key IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_2b776a4761a52e1e4c5208191a" ON "scheduled_jobs"  ("status", "run_at") `);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "title_ar" character varying(200) NOT NULL, "title_en" character varying(200) NOT NULL, "body_ar" text NOT NULL, "body_en" text NOT NULL, "link" character varying(300), "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5323ccd23482802bd9759e88ee" ON "notifications"  ("user_id", "read_at") `);
        await queryRunner.query(`CREATE TABLE "workflow_instances" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "definition_key" character varying(100) NOT NULL, "definition_version" integer NOT NULL, "entity_type" character varying(80) NOT NULL, "entity_id" uuid NOT NULL, "state" character varying(200) NOT NULL, "is_done" boolean NOT NULL DEFAULT false, "snapshot" jsonb NOT NULL, "started_by" uuid, "revision" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_90cc94e44ff8b7b7869f50e4fc4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1eee5cfefaad7a8e581911c98d" ON "workflow_instances"  ("state") `);
        await queryRunner.query(`CREATE INDEX "IDX_087808418dfc2d9ca185134138" ON "workflow_instances"  ("entity_type", "entity_id") `);
        await queryRunner.query(`CREATE TABLE "workflow_transitions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "instance_id" uuid NOT NULL, "event" character varying(80) NOT NULL, "from_state" character varying(200) NOT NULL, "to_state" character varying(200) NOT NULL, "actor_id" uuid, "comment" character varying(1000), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_edda0b5bb7b13fc6681c56764af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_044d830d378888731005dfc150" ON "workflow_transitions"  ("instance_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "email" character varying(254) NOT NULL, "locale" character varying(2) NOT NULL DEFAULT 'ar', "phone" character varying(20), "is_active" boolean NOT NULL DEFAULT true, "two_factor_enabled" boolean DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "image" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "code" character varying(20) NOT NULL, "city" character varying(80), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5b8774b3a1ac4a0218ac8e3eee" ON "branches"  ("code") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "branch_id" uuid NOT NULL, "parent_id" uuid, "head_user_id" uuid, CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_40b8818a0e3324c85919926550" ON "departments"  ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_700b0b13f494cb37b6ca929e79" ON "departments"  ("parent_id") `);
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "department_id" uuid NOT NULL, "lead_user_id" uuid, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da396a3d0106549cc8a55d6d7d" ON "teams"  ("department_id") `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_placements" ADD CONSTRAINT "FK_user_placements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_placements" ADD CONSTRAINT "FK_user_placements_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_placements" ADD CONSTRAINT "FK_user_placements_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_placements" ADD CONSTRAINT "FK_user_placements_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_placements" ADD CONSTRAINT "FK_user_placements_manager" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_files_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_transitions" ADD CONSTRAINT "FK_044d830d378888731005dfc1505" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_parent" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_department"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_parent"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_branch"`);
        await queryRunner.query(`ALTER TABLE "workflow_transitions" DROP CONSTRAINT "FK_044d830d378888731005dfc1505"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_files_owner"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`);
        await queryRunner.query(`ALTER TABLE "user_placements" DROP CONSTRAINT "FK_user_placements_manager"`);
        await queryRunner.query(`ALTER TABLE "user_placements" DROP CONSTRAINT "FK_user_placements_team"`);
        await queryRunner.query(`ALTER TABLE "user_placements" DROP CONSTRAINT "FK_user_placements_department"`);
        await queryRunner.query(`ALTER TABLE "user_placements" DROP CONSTRAINT "FK_user_placements_branch"`);
        await queryRunner.query(`ALTER TABLE "user_placements" DROP CONSTRAINT "FK_user_placements_user"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da396a3d0106549cc8a55d6d7d"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_700b0b13f494cb37b6ca929e79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40b8818a0e3324c85919926550"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b8774b3a1ac4a0218ac8e3eee"`);
        await queryRunner.query(`DROP TABLE "branches"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_044d830d378888731005dfc150"`);
        await queryRunner.query(`DROP TABLE "workflow_transitions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_087808418dfc2d9ca185134138"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1eee5cfefaad7a8e581911c98d"`);
        await queryRunner.query(`DROP TABLE "workflow_instances"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5323ccd23482802bd9759e88ee"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b776a4761a52e1e4c5208191a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_72e924cd41713f5c899d49d01d"`);
        await queryRunner.query(`DROP TABLE "scheduled_jobs"`);
        await queryRunner.query(`DROP TABLE "processed_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_030ccebb8bfd393befb0ae4314"`);
        await queryRunner.query(`DROP TABLE "outbox_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4bc1db1f4f34ec9415acd88afd"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_177183f29f438c488b5e8510cd"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_role"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_placements_manager_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_placements_team_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_placements_department_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_placements_branch_id"`);
        await queryRunner.query(`DROP TABLE "user_placements"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
    }

}
