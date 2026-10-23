import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Units get the day they started working (existing units: the day they were created) and levels remember which default
 * level they came from (existing levels: matched by their English name to the seeded template, e.g. "Department").
 */
export class OrgUnitStartDate1792721578213 implements MigrationInterface {
  name = 'OrgUnitStartDate1792721578213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "org_levels" ADD "template_code" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "org_nodes" ADD "start_date" date`);
    await queryRunner.query(`UPDATE "org_nodes" SET "start_date" = "created_at"::date`);
    await queryRunner.query(`ALTER TABLE "org_nodes" ALTER COLUMN "start_date" SET NOT NULL`);
    await queryRunner.query(`
      UPDATE "org_levels" l SET "template_code" = t."code"
      FROM "org_level_translations" lt
      JOIN "org_level_template_translations" tt ON tt."lang" = 'en' AND lower(tt."name") = lower(lt."name")
      JOIN "org_level_templates" t ON t."id" = tt."org_level_template_id"
      WHERE lt."org_level_id" = l."id" AND lt."lang" = 'en'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "org_nodes" DROP COLUMN "start_date"`);
    await queryRunner.query(`ALTER TABLE "org_levels" DROP COLUMN "template_code"`);
  }
}
