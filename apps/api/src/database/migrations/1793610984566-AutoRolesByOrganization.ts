import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoRolesByOrganization1793610984566 implements MigrationInterface {
    name = 'AutoRolesByOrganization1793610984566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "job_title_id" uuid`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "org_level_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_job_title" ON "roles"  ("job_title_id") WHERE job_title_id IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_org_level" ON "roles"  ("org_level_id") WHERE org_level_id IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_job_title" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_org_level" FOREIGN KEY ("org_level_id") REFERENCES "org_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_org_level"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_job_title"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roles_org_level"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roles_job_title"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "org_level_id"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "job_title_id"`);
    }

}
