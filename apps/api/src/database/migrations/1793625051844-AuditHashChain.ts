import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditHashChain1793625051844 implements MigrationInterface {
    name = 'AuditHashChain1793625051844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "prev_hash" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "hash" character varying(64)`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_seq" ON "audit_logs" ("seq")`);
        // The log is append-only for the application too: a change or a removal is refused by the database itself (TRUNCATE is how tests reset it).
        await queryRunner.query(`CREATE FUNCTION audit_logs_append_only() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql`);
        await queryRunner.query(`CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER audit_logs_append_only ON "audit_logs"`);
        await queryRunner.query(`DROP FUNCTION audit_logs_append_only()`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_seq"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "hash"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "prev_hash"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "seq"`);
    }

}
