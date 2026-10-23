import { MigrationInterface, QueryRunner } from 'typeorm';

/** Platform admin mode lives on the session: it ends with the session, and the columns are managed with raw SQL like mfa_verified_at. */
export class AdminMode1792720000000 implements MigrationInterface {
  name = 'AdminMode1792720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "admin_mode_enabled_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "admin_mode_last_activity_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "admin_mode_last_activity_at"`);
    await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "admin_mode_enabled_at"`);
  }
}
