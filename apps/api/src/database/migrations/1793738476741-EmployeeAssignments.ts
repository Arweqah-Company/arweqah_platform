import { MigrationInterface, QueryRunner } from "typeorm";

/** Dated placement of employees (FR-89): the table, the first period of everyone already in the system, and the key to change it. */
export class EmployeeAssignments1793738476741 implements MigrationInterface {
    name = 'EmployeeAssignments1793738476741'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_assignments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "field" character varying(20) NOT NULL, "org_node_id" uuid, "job_title_id" uuid, "manager_employee_id" uuid, "valid_from" date NOT NULL, "valid_to" date, "reason" text NOT NULL, "created_by" uuid, "applied_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_employee_assignments_value" CHECK ((field = 'org_node' AND org_node_id IS NOT NULL AND job_title_id IS NULL AND manager_employee_id IS NULL)
   OR (field = 'job_title' AND job_title_id IS NOT NULL AND org_node_id IS NULL AND manager_employee_id IS NULL)
   OR (field = 'manager' AND org_node_id IS NULL AND job_title_id IS NULL)), CONSTRAINT "CHK_employee_assignments_period" CHECK (valid_to IS NULL OR valid_to >= valid_from), CONSTRAINT "PK_edc3676ac1a9278571e480f9652" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_employee_assignments_due" ON "employee_assignments"  ("valid_from") WHERE applied_at IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_employee_assignments_period" ON "employee_assignments"  ("employee_id", "field", "valid_from") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_employee_assignments_open" ON "employee_assignments"  ("employee_id", "field") WHERE valid_to IS NULL`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" ADD CONSTRAINT "FK_employee_assignments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" ADD CONSTRAINT "FK_employee_assignments_org_node" FOREIGN KEY ("org_node_id") REFERENCES "org_nodes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" ADD CONSTRAINT "FK_employee_assignments_job_title" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" ADD CONSTRAINT "FK_employee_assignments_manager" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        // Everybody already in the system starts with one period per value, from the day they started (or today if they start later).
        await queryRunner.query(`
            INSERT INTO employee_assignments (employee_id, field, org_node_id, job_title_id, manager_employee_id, valid_from, reason, applied_at)
            SELECT e.id, 'org_node', e.org_node_id, NULL::uuid, NULL::uuid, LEAST(e.start_date, CURRENT_DATE), 'Placement at the start of history', now()
              FROM employees e WHERE e.deleted_at IS NULL AND e.org_node_id IS NOT NULL
            UNION ALL
            SELECT e.id, 'job_title', NULL::uuid, e.job_title_id, NULL::uuid, LEAST(e.start_date, CURRENT_DATE), 'Placement at the start of history', now()
              FROM employees e WHERE e.deleted_at IS NULL AND e.job_title_id IS NOT NULL
            UNION ALL
            SELECT e.id, 'manager', NULL::uuid, NULL::uuid, e.manager_id, LEAST(e.start_date, CURRENT_DATE), 'Placement at the start of history', now()
              FROM employees e WHERE e.deleted_at IS NULL`);
        // Whoever may edit employees company-wide or everywhere may also change the placement of those people.
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT p.role_id, 'employees.assign_change', p.scope FROM role_permissions p
            WHERE p.permission_key = 'employees.update' AND p.scope IN ('company', 'all')
            AND NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = p.role_id AND x.permission_key = 'employees.assign_change')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions WHERE permission_key = 'employees.assign_change'`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP CONSTRAINT "FK_employee_assignments_manager"`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP CONSTRAINT "FK_employee_assignments_job_title"`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP CONSTRAINT "FK_employee_assignments_org_node"`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP CONSTRAINT "FK_employee_assignments_employee"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_employee_assignments_open"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_employee_assignments_period"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_employee_assignments_due"`);
        await queryRunner.query(`DROP TABLE "employee_assignments"`);
    }

}
