import { MigrationInterface, QueryRunner } from "typeorm";

/** «Sign in as»: a session can belong to a platform administrator working as another employee; it points to the administrator and to the session to return to. */
export class Impersonation1793629000000 implements MigrationInterface {
    name = 'Impersonation1793629000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "impersonated_by_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "impersonator_session_id" uuid`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD "impersonation_last_activity_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_impersonated_by" FOREIGN KEY ("impersonated_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
        // Ending the administrator's own session ends the «sign in as» session that depends on it.
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_impersonator_session" FOREIGN KEY ("impersonator_session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE`);
        await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_impersonator_session" ON "auth_sessions" ("impersonator_session_id") WHERE "impersonator_session_id" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_auth_sessions_impersonator_session"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_impersonator_session"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_impersonated_by"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "impersonation_last_activity_at"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "impersonator_session_id"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP COLUMN "impersonated_by_user_id"`);
    }

}
