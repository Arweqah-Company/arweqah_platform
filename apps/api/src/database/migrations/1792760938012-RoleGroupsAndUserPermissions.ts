import { MigrationInterface, QueryRunner } from "typeorm";

export class RoleGroupsAndUserPermissions1792760938012 implements MigrationInterface {
    name = 'RoleGroupsAndUserPermissions1792760938012'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description" character varying(500), CONSTRAINT "PK_d4acd163227ca8dfb8de61ee1af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_group_roles" ("group_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_0e55abfbc70d94c60614cc17c70" PRIMARY KEY ("group_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_role_group_roles_role" ON "role_group_roles"  ("role_id") `);
        await queryRunner.query(`CREATE TABLE "user_permissions" ("user_id" uuid NOT NULL, "permission_key" character varying(100) NOT NULL, "scope" character varying(20) NOT NULL, CONSTRAINT "PK_d04db4790930690131c840a9c62" PRIMARY KEY ("user_id", "permission_key"))`);
        await queryRunner.query(`CREATE TABLE "user_role_groups" ("user_id" uuid NOT NULL, "group_id" uuid NOT NULL, CONSTRAINT "PK_f65202d3950523f65d82e53eb99" PRIMARY KEY ("user_id", "group_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_role_groups_group" ON "user_role_groups"  ("group_id") `);
        await queryRunner.query(`ALTER TABLE "role_group_roles" ADD CONSTRAINT "FK_role_group_roles_group" FOREIGN KEY ("group_id") REFERENCES "role_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_group_roles" ADD CONSTRAINT "FK_role_group_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_user_permissions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD CONSTRAINT "FK_user_role_groups_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD CONSTRAINT "FK_user_role_groups_group" FOREIGN KEY ("group_id") REFERENCES "role_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP CONSTRAINT "FK_user_role_groups_group"`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP CONSTRAINT "FK_user_role_groups_user"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_user_permissions_user"`);
        await queryRunner.query(`ALTER TABLE "role_group_roles" DROP CONSTRAINT "FK_role_group_roles_role"`);
        await queryRunner.query(`ALTER TABLE "role_group_roles" DROP CONSTRAINT "FK_role_group_roles_group"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_role_groups_group"`);
        await queryRunner.query(`DROP TABLE "user_role_groups"`);
        await queryRunner.query(`DROP TABLE "user_permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_role_group_roles_role"`);
        await queryRunner.query(`DROP TABLE "role_group_roles"`);
        await queryRunner.query(`DROP TABLE "role_groups"`);
    }

}
