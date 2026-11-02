import { MigrationInterface, QueryRunner } from "typeorm";

export class AccessExceptions1793620557615 implements MigrationInterface {
    name = 'AccessExceptions1793620557615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD "expires_at" date`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD "granted_by" uuid`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD "expires_at" date`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD "granted_by" uuid`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD "expires_at" date`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD "granted_by" uuid`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_user_permissions_granted_by" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" ADD CONSTRAINT "FK_user_role_groups_granted_by" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_granted_by" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP CONSTRAINT "FK_user_role_groups_granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_user_permissions_granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "granted_at"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "expires_at"`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP COLUMN "granted_at"`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP COLUMN "granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_role_groups" DROP COLUMN "expires_at"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP COLUMN "granted_at"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP COLUMN "granted_by"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP COLUMN "expires_at"`);
    }

}
