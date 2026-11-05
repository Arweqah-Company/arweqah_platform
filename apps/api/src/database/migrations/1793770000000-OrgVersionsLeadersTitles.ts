import { MigrationInterface, QueryRunner } from "typeorm";

/** The keys of the job-titles page, given to everyone who manages job titles today (the same scope), so nobody loses what they do now. */
const TITLE_KEYS = ['job_titles.create', 'job_titles.update', 'job_titles.delete', 'job_titles.import'];
const ALL_SCOPE_KEYS = ['job_titles.view', 'job_titles.export'];
const GRANT_TABLES: Record<string, string> = { role_permissions: 'role_id', role_group_permissions: 'group_id', user_group_permissions: 'group_id', user_permissions: 'user_id' };
const LIST = `'{"ar":[],"en":[]}'::jsonb`;

/**
 * Fills `manager_source` of the manager periods that exist before this migration: a period that names a manager was chosen by a person (`manual`);
 * one with no manager was never chosen by anybody, so the system may fill it by the reporting line (`auto_chain`).
 */
export const MANAGER_SOURCE_BACKFILL = `UPDATE employee_assignments SET manager_source = CASE WHEN manager_employee_id IS NULL THEN 'auto_chain' ELSE 'manual' END WHERE field = 'manager'`;

/**
 * Stage 4 of the group structure (phase 5, FR-99, FR-100, FR-104…FR-107): dated versions and the charter of a unit, leaders per company with
 * acting leaders, grade / track / code / reporting line / content on job titles, the development-stage rules, and where an employee's manager came from.
 */
export class OrgVersionsLeadersTitles1793770000000 implements MigrationInterface {
    name = 'OrgVersionsLeadersTitles1793770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
        await this.versions(queryRunner);
        await this.leaders(queryRunner);
        await this.titles(queryRunner);
        await this.stageRules(queryRunner);
        await this.managerSource(queryRunner);
        await this.grantKeys(queryRunner);
    }

    private async versions(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE "org_nodes" ADD "charter" jsonb`);
        await q.query(`CREATE TABLE "org_node_versions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "node_id" uuid NOT NULL, "valid_from" date NOT NULL, "valid_to" date, "name_ar" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "code" character varying(20), "is_active" boolean NOT NULL DEFAULT true, "charter" jsonb, "reason" text NOT NULL, "created_by" uuid, "applied_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_org_node_versions_period" CHECK (valid_to IS NULL OR valid_to >= valid_from), CONSTRAINT "EXCL_org_node_versions_overlap" EXCLUDE USING gist (node_id WITH =, daterange(valid_from, valid_to, '[]') WITH &&), CONSTRAINT "PK_org_node_versions" PRIMARY KEY ("id"))`);
        await q.query(`CREATE INDEX "IDX_org_node_versions_node" ON "org_node_versions" ("node_id", "valid_from")`);
        await q.query(`CREATE INDEX "IDX_org_node_versions_due" ON "org_node_versions" ("valid_from") WHERE applied_at IS NULL`);
        await q.query(`ALTER TABLE "org_node_versions" ADD CONSTRAINT "FK_org_node_versions_node" FOREIGN KEY ("node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    private async leaders(q: QueryRunner): Promise<void> {
        await q.query(`CREATE TABLE "org_node_leaders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "node_id" uuid NOT NULL, "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "kind" character varying(10) NOT NULL, "valid_from" date NOT NULL, "valid_to" date, "reason" text NOT NULL, "created_by" uuid, CONSTRAINT "CHK_org_node_leaders_period" CHECK (valid_to IS NULL OR valid_to >= valid_from), CONSTRAINT "CHK_org_node_leaders_kind" CHECK (kind IN ('leader', 'acting')), CONSTRAINT "CHK_org_node_leaders_acting_window" CHECK (kind = 'leader' OR valid_to IS NOT NULL), CONSTRAINT "EXCL_org_node_leaders_overlap" EXCLUDE USING gist (node_id WITH =, company_id WITH =, kind WITH =, daterange(valid_from, valid_to, '[]') WITH &&), CONSTRAINT "PK_org_node_leaders" PRIMARY KEY ("id"))`);
        await q.query(`CREATE INDEX "IDX_org_node_leaders_node" ON "org_node_leaders" ("node_id", "valid_from")`);
        await q.query(`CREATE INDEX "IDX_org_node_leaders_employee" ON "org_node_leaders" ("employee_id")`);
        await q.query(`ALTER TABLE "org_node_leaders" ADD CONSTRAINT "FK_org_node_leaders_node" FOREIGN KEY ("node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await q.query(`ALTER TABLE "org_node_leaders" ADD CONSTRAINT "FK_org_node_leaders_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await q.query(`ALTER TABLE "org_node_leaders" ADD CONSTRAINT "FK_org_node_leaders_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // The manager every unit has today becomes its leader for the manager's company: in a unit managed per company always, in a shared unit only when the manager belongs to the group company.
        await q.query(`
            INSERT INTO org_node_leaders (node_id, company_id, employee_id, kind, valid_from, valid_to, reason)
            SELECT n.id, e.company_id, n.manager_id, 'leader', LEAST(n.start_date, CURRENT_DATE), NULL, 'Imported from the unit manager'
            FROM org_nodes n
            JOIN employees e ON e.id = n.manager_id AND e.deleted_at IS NULL
            WHERE n.deleted_at IS NULL AND n.manager_id IS NOT NULL
              AND (COALESCE((SELECT a.management_mode FROM org_node_closure c JOIN org_nodes a ON a.id = c.ancestor_id AND a.deleted_at IS NULL
                             WHERE c.descendant_id = n.id AND a.management_mode IS NOT NULL ORDER BY c.depth LIMIT 1), 'per_company') = 'per_company'
                   OR e.company_id = (SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY (code = 'ARW') DESC, created_at, id LIMIT 1))`);
    }

    private async titles(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE "job_titles" ADD "code" character varying(40)`);
        await q.query(`ALTER TABLE "job_titles" ADD "grade" smallint`);
        await q.query(`ALTER TABLE "job_titles" ADD "track" character varying(1)`);
        await q.query(`ALTER TABLE "job_titles" ADD "reports_to_title_id" uuid`);
        for (const column of ['responsibilities', 'qualifications', 'kpis']) {
            await q.query(`ALTER TABLE "job_titles" ADD "${column}" jsonb NOT NULL DEFAULT ${LIST}`);
            await q.query(`ALTER TABLE "job_titles" ALTER COLUMN "${column}" DROP DEFAULT`);
        }
        await q.query(`ALTER TABLE "job_titles" ADD "content_version" integer NOT NULL DEFAULT 1`);
        await q.query(`ALTER TABLE "job_titles" ADD CONSTRAINT "CHK_job_titles_grade" CHECK (grade IS NULL OR (grade >= 1 AND grade <= 9))`);
        await q.query(`ALTER TABLE "job_titles" ADD CONSTRAINT "CHK_job_titles_track" CHECK (track IS NULL OR track IN ('M', 'P', 'J', 'C', 'S'))`);
        await q.query(`ALTER TABLE "job_titles" ADD CONSTRAINT "CHK_job_titles_grade_track" CHECK ((grade IS NULL) = (track IS NULL))`);
        await q.query(`ALTER TABLE "job_titles" ADD CONSTRAINT "CHK_job_titles_reports_to_self" CHECK (reports_to_title_id IS NULL OR reports_to_title_id <> id)`);
        await q.query(`CREATE UNIQUE INDEX "UQ_job_titles_code" ON "job_titles" ("code") WHERE code IS NOT NULL`);
        await q.query(`CREATE INDEX "IDX_job_titles_reports_to" ON "job_titles" ("reports_to_title_id")`);
        await q.query(`ALTER TABLE "job_titles" ADD CONSTRAINT "FK_job_titles_reports_to" FOREIGN KEY ("reports_to_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    private async stageRules(q: QueryRunner): Promise<void> {
        await q.query(`CREATE TABLE "development_stage_rules" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "grade" smallint NOT NULL, "track" character varying(1), "stage" character varying(40) NOT NULL, CONSTRAINT "CHK_development_stage_rules_grade" CHECK (grade >= 1 AND grade <= 9), CONSTRAINT "PK_development_stage_rules" PRIMARY KEY ("id"))`);
        await q.query(`CREATE UNIQUE INDEX "UQ_development_stage_rules_track" ON "development_stage_rules" ("grade", "track") WHERE track IS NOT NULL`);
        await q.query(`CREATE UNIQUE INDEX "UQ_development_stage_rules_grade" ON "development_stage_rules" ("grade") WHERE track IS NULL`);
    }

    /** Existing periods that name a manager are `manual`, those with none are `auto_chain`; the system sets `auto_chain` from now on. */
    private async managerSource(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE "employee_assignments" ADD "manager_source" character varying(20)`);
        await q.query(MANAGER_SOURCE_BACKFILL);
        await q.query(`ALTER TABLE "employee_assignments" ADD CONSTRAINT "CHK_employee_assignments_manager_source" CHECK ((field = 'manager') = (manager_source IS NOT NULL) AND (manager_source IS NULL OR manager_source IN ('auto_chain', 'manual')))`);
    }

    private async grantKeys(q: QueryRunner): Promise<void> {
        // Everyone holds the Employee role: everyone may browse the titles.
        await q.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'job_titles.view', 'all' FROM roles r WHERE r.auto_rule = 'everyone'
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'job_titles.view')`);
        for (const [table, holder] of Object.entries(GRANT_TABLES)) {
            await q.query(
                `INSERT INTO "${table}" ("${holder}", "permission_key", "scope")
                 SELECT h."${holder}", k.key, CASE WHEN k.key = ANY($2::text[]) THEN 'all' ELSE h.scope END
                 FROM (SELECT DISTINCT ON ("${holder}") "${holder}", scope FROM "${table}" WHERE permission_key = 'org.titles_manage'
                       ORDER BY "${holder}", CASE scope WHEN 'all' THEN 0 ELSE 1 END) h
                 CROSS JOIN unnest($1::text[]) AS k(key)
                 ON CONFLICT DO NOTHING`, [[...TITLE_KEYS, ...ALL_SCOPE_KEYS], ALL_SCOPE_KEYS]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const keys = [...TITLE_KEYS, ...ALL_SCOPE_KEYS];
        for (const table of Object.keys(GRANT_TABLES)) await queryRunner.query(`DELETE FROM "${table}" WHERE permission_key = ANY($1)`, [keys]);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP CONSTRAINT "CHK_employee_assignments_manager_source"`);
        await queryRunner.query(`ALTER TABLE "employee_assignments" DROP COLUMN "manager_source"`);
        await queryRunner.query(`DROP TABLE "development_stage_rules"`);
        await queryRunner.query(`ALTER TABLE "job_titles" DROP CONSTRAINT "FK_job_titles_reports_to"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_job_titles_reports_to"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_job_titles_code"`);
        for (const check of ['CHK_job_titles_reports_to_self', 'CHK_job_titles_grade_track', 'CHK_job_titles_track', 'CHK_job_titles_grade']) {
            await queryRunner.query(`ALTER TABLE "job_titles" DROP CONSTRAINT "${check}"`);
        }
        for (const column of ['content_version', 'kpis', 'qualifications', 'responsibilities', 'reports_to_title_id', 'track', 'grade', 'code']) {
            await queryRunner.query(`ALTER TABLE "job_titles" DROP COLUMN "${column}"`);
        }
        await queryRunner.query(`DROP TABLE "org_node_leaders"`);
        await queryRunner.query(`DROP TABLE "org_node_versions"`);
        await queryRunner.query(`ALTER TABLE "org_nodes" DROP COLUMN "charter"`);
    }

}
