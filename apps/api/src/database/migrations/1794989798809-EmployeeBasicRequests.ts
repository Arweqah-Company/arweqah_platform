import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Requests to change the basic data of one's own record (FR-162), and the key that lets a person send one (`profile.update_basic`): it goes into the
 * Employee role and the head role of every unit (both start from the own-account keys); only roles that lack it get it.
 */
export class EmployeeBasicRequests1794989798809 implements MigrationInterface {
    name = 'EmployeeBasicRequests1794989798809'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_basic_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "changes" jsonb NOT NULL, "status" character varying(16) NOT NULL, "rejection_reason" character varying(500), "decided_by" uuid, "decided_at" TIMESTAMP WITH TIME ZONE, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_49067322b85420e5e164f138b1c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_employee_basic_requests_pending" ON "employee_basic_requests"  ("employee_id") WHERE status = 'pending'`);
        await queryRunner.query(`CREATE INDEX "IDX_employee_basic_requests_employee" ON "employee_basic_requests"  ("employee_id", "submitted_at") `);
        await queryRunner.query(`ALTER TABLE "employee_basic_requests" ADD CONSTRAINT "FK_employee_basic_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'profile.update_basic', 'all' FROM roles r
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'profile.update_basic')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key = 'profile.update_basic' AND role_id IN (SELECT id FROM roles WHERE auto_rule IN ('everyone', 'node_head'))`);
        await queryRunner.query(`ALTER TABLE "employee_basic_requests" DROP CONSTRAINT "FK_employee_basic_requests_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_employee_basic_requests_employee"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_employee_basic_requests_pending"`);
        await queryRunner.query(`DROP TABLE "employee_basic_requests"`);
    }

}
