import { MigrationInterface, QueryRunner } from "typeorm";

export class UserGroupsAndGroupPermissions1792761523799 implements MigrationInterface {
    name = 'UserGroupsAndGroupPermissions1792761523799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_group_permissions" ("group_id" uuid NOT NULL, "permission_key" character varying(100) NOT NULL, "scope" character varying(20) NOT NULL, CONSTRAINT "PK_50787b968c1c0dac5d0fe3004b6" PRIMARY KEY ("group_id", "permission_key"))`);
        await queryRunner.query(`CREATE TABLE "user_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description" character varying(500), CONSTRAINT "PK_ea7760dc75ee1bf0b09ab9b3289" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_group_members" ("group_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_df1fd0cc48111f3bc8f945046ab" PRIMARY KEY ("group_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_group_members_user" ON "user_group_members"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "user_group_permissions" ("group_id" uuid NOT NULL, "permission_key" character varying(100) NOT NULL, "scope" character varying(20) NOT NULL, CONSTRAINT "PK_9265116ed87e1b90bb5aab8eaa1" PRIMARY KEY ("group_id", "permission_key"))`);
        await queryRunner.query(`ALTER TABLE "role_group_permissions" ADD CONSTRAINT "FK_role_group_permissions_group" FOREIGN KEY ("group_id") REFERENCES "role_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_group_members" ADD CONSTRAINT "FK_user_group_members_group" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_group_members" ADD CONSTRAINT "FK_user_group_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_group_permissions" ADD CONSTRAINT "FK_user_group_permissions_group" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_group_permissions" DROP CONSTRAINT "FK_user_group_permissions_group"`);
        await queryRunner.query(`ALTER TABLE "user_group_members" DROP CONSTRAINT "FK_user_group_members_user"`);
        await queryRunner.query(`ALTER TABLE "user_group_members" DROP CONSTRAINT "FK_user_group_members_group"`);
        await queryRunner.query(`ALTER TABLE "role_group_permissions" DROP CONSTRAINT "FK_role_group_permissions_group"`);
        await queryRunner.query(`DROP TABLE "user_group_permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_group_members_user"`);
        await queryRunner.query(`DROP TABLE "user_group_members"`);
        await queryRunner.query(`DROP TABLE "user_groups"`);
        await queryRunner.query(`DROP TABLE "role_group_permissions"`);
    }

}
