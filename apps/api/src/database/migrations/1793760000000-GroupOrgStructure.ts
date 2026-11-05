import { MigrationInterface, QueryRunner } from "typeorm";

/** The five built-in unit types in order: key, Arabic and English names, accepts titles, slot in a unit code (null = the office takes the slot where it sits). */
const BUILT_IN: { key: string; ar: string; en: string; titles: boolean; slot: number | null }[] = [
    { key: 'sector', ar: 'قطاع', en: 'Sector', titles: false, slot: 1 },
    { key: 'department', ar: 'إدارة', en: 'Department', titles: true, slot: 2 },
    { key: 'section', ar: 'قسم', en: 'Section', titles: true, slot: 3 },
    { key: 'unit', ar: 'وحدة', en: 'Unit', titles: true, slot: 4 },
    { key: 'office', ar: 'مكتب', en: 'Office', titles: true, slot: null },
];

/** Who may be created under whom, by default (`root` is the group). Two rules stay in code: a sector only under the root, no office under an office. */
const DEFAULT_RULES: [string, string][] = [
    ['root', 'sector'], ['root', 'department'], ['root', 'office'],
    ['sector', 'department'], ['sector', 'section'], ['sector', 'unit'], ['sector', 'office'],
    ['department', 'section'], ['department', 'unit'], ['department', 'office'],
    ['section', 'unit'], ['section', 'office'],
    ['office', 'section'], ['office', 'unit'],
];

/** The keys granted to everyone who may edit units or the structure today, so nobody loses what they see now (never the plain Employee role). */
const NEW_KEYS = ['org.view_full', 'org.unit_share', 'org.charter_edit', 'org.leaders_manage', 'org.titles_edit_content'];
const GRANT_TABLES: Record<string, string> = { role_permissions: 'role_id', role_group_permissions: 'group_id', user_group_permissions: 'group_id', user_permissions: 'user_id' };

/**
 * One organization structure for the whole group (phase 5, stage 2; decisions 200–208, D27 in docs/decisions.md):
 * unit types are group-wide (no `company_id`) with the new office type and a «who may be created under whom» table, and every
 * unit gets a nullable `code` and `management_mode`. `org_nodes.company_id` stays and means «the group company» (decision 209).
 * It stops with a clear error when a company other than the group company has units, because those would need a merge map.
 */
export class GroupOrgStructure1793760000000 implements MigrationInterface {
    name = 'GroupOrgStructure1793760000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const group = await this.groupCompany(queryRunner);
        await this.assertNoOtherStructure(queryRunner, group);
        await this.repointDeletedUnits(queryRunner, group);
        await this.makeLevelsGroupWide(queryRunner, group);
        await this.addBuiltInTypes(queryRunner);
        await this.createRulesTable(queryRunner);
        await this.addUnitColumns(queryRunner, group);
        await this.addTemplate(queryRunner);
        await this.grantKeys(queryRunner);
    }

    /** The company that holds every unit: the one coded ARW, else the oldest. Null on a database with no company yet. */
    private async groupCompany(q: QueryRunner): Promise<string | null> {
        const rows: { id: string }[] = await q.query(`SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY (code = 'ARW') DESC, created_at, id LIMIT 1`);
        return rows[0]?.id ?? null;
    }

    private async assertNoOtherStructure(q: QueryRunner, group: string | null): Promise<void> {
        const rows: { code: string; n: string }[] = await q.query(
            `SELECT c.code, count(*) AS n FROM org_nodes n JOIN companies c ON c.id = n.company_id
             WHERE n.deleted_at IS NULL AND n.company_id IS DISTINCT FROM $1::uuid GROUP BY c.code ORDER BY c.code`, [group]);
        if (rows.length) {
            const list = rows.map((r) => `${r.code} (${r.n})`).join(', ');
            throw new Error(`GroupOrgStructure stopped: companies other than the group company have units: ${list}. Merge them into the group structure with a map first.`);
        }
    }

    /** Deleted units of other companies keep their history: they move to the group company and to the same-position level of the group. */
    private async repointDeletedUnits(q: QueryRunner, group: string | null): Promise<void> {
        await q.query(
            `UPDATE org_nodes n SET org_level_id = COALESCE(
                (SELECT g.id FROM org_levels g JOIN org_levels o ON o.id = n.org_level_id WHERE g.company_id = $1 AND g.deleted_at IS NULL AND g.sort_order = o.sort_order),
                (SELECT g.id FROM org_levels g WHERE g.company_id = $1 AND g.deleted_at IS NULL ORDER BY g.sort_order DESC LIMIT 1), n.org_level_id)
             WHERE n.company_id IS DISTINCT FROM $1::uuid AND $1::uuid IS NOT NULL`, [group]);
        await q.query(`UPDATE org_nodes SET company_id = $1 WHERE company_id IS DISTINCT FROM $1::uuid AND $1::uuid IS NOT NULL`, [group]);
    }

    private async makeLevelsGroupWide(q: QueryRunner, group: string | null): Promise<void> {
        await q.query(`DELETE FROM org_levels WHERE company_id IS DISTINCT FROM $1::uuid`, [group]);
        await q.query(`DROP INDEX "public"."UQ_org_levels_company_order"`);
        await q.query(`DROP INDEX "public"."IDX_org_levels_company"`);
        await q.query(`ALTER TABLE "org_levels" DROP CONSTRAINT "FK_org_levels_company"`);
        await q.query(`ALTER TABLE "org_levels" DROP COLUMN "company_id"`);
        await q.query(`ALTER TABLE "org_levels" ADD "is_built_in" boolean NOT NULL DEFAULT false`);
        await q.query(`ALTER TABLE "org_levels" ADD "tone" character varying(20) NOT NULL DEFAULT 'unit'`);
        await q.query(`ALTER TABLE "org_levels" ADD "code_slot" integer`);
        await q.query(`UPDATE org_levels SET template_code = 'custom_' || substr(md5(id::text), 1, 8) WHERE template_code IS NULL`);
        await q.query(`ALTER TABLE "org_levels" ALTER COLUMN "template_code" SET NOT NULL`);
        for (const t of BUILT_IN.filter((b) => b.key !== 'office')) {
            await q.query(
                `UPDATE org_levels SET is_built_in = true, tone = $1, code_slot = $2, is_assignable = $3 WHERE template_code = $1 AND deleted_at IS NULL`,
                [t.key, t.slot, t.titles]);
        }
        await q.query(`CREATE UNIQUE INDEX "UQ_org_levels_order" ON "org_levels" ("sort_order") WHERE deleted_at IS NULL`);
        await q.query(`CREATE UNIQUE INDEX "UQ_org_levels_key" ON "org_levels" ("template_code") WHERE deleted_at IS NULL`);
    }

    /** Adds every built-in type that is missing (the office everywhere; all five on a database with no structure yet), after the types that exist. */
    private async addBuiltInTypes(q: QueryRunner): Promise<void> {
        for (const t of BUILT_IN) {
            const rows: { id: string }[] = await q.query(
                `INSERT INTO org_levels (sort_order, is_assignable, template_code, is_built_in, tone, code_slot)
                 SELECT COALESCE(MAX(sort_order), 0) + 1, $2::boolean, $1::varchar, true, $1::varchar, $3::int FROM org_levels WHERE deleted_at IS NULL
                 HAVING NOT EXISTS (SELECT 1 FROM org_levels WHERE template_code = $1 AND deleted_at IS NULL)
                 RETURNING id`, [t.key, t.titles, t.slot]);
            if (!rows[0]) continue;
            await q.query(`INSERT INTO org_level_translations (org_level_id, lang, name) VALUES ($1, 'ar', $2), ($1, 'en', $3)`, [rows[0].id, t.ar, t.en]);
        }
    }

    private async createRulesTable(q: QueryRunner): Promise<void> {
        await q.query(`CREATE TABLE "org_level_parents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "parent_level_id" uuid, "child_level_id" uuid NOT NULL, CONSTRAINT "PK_org_level_parents" PRIMARY KEY ("id"))`);
        await q.query(`CREATE UNIQUE INDEX "UQ_org_level_parents_pair" ON "org_level_parents" ("parent_level_id", "child_level_id")`);
        await q.query(`CREATE UNIQUE INDEX "UQ_org_level_parents_root" ON "org_level_parents" ("child_level_id") WHERE parent_level_id IS NULL`);
        await q.query(`CREATE INDEX "IDX_org_level_parents_child" ON "org_level_parents" ("child_level_id")`);
        await q.query(`ALTER TABLE "org_level_parents" ADD CONSTRAINT "FK_org_level_parents_parent" FOREIGN KEY ("parent_level_id") REFERENCES "org_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await q.query(`ALTER TABLE "org_level_parents" ADD CONSTRAINT "FK_org_level_parents_child" FOREIGN KEY ("child_level_id") REFERENCES "org_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        for (const [parent, child] of DEFAULT_RULES) {
            await q.query(
                `INSERT INTO org_level_parents (parent_level_id, child_level_id)
                 SELECT p.id, c.id FROM org_levels c LEFT JOIN org_levels p ON p.template_code = $1 AND p.deleted_at IS NULL
                 WHERE c.template_code = $2 AND c.deleted_at IS NULL AND ($1 = 'root' OR p.id IS NOT NULL)
                 AND NOT EXISTS (SELECT 1 FROM org_level_parents x WHERE x.child_level_id = c.id AND x.parent_level_id IS NOT DISTINCT FROM p.id)`,
                [parent, child]);
        }
    }

    /** Existing units keep a null code (the official prefixes cannot be invented); the units at the top, which the group managed centrally, become shared. */
    private async addUnitColumns(q: QueryRunner, group: string | null): Promise<void> {
        await q.query(`ALTER TABLE "org_nodes" ADD "code" character varying(20)`);
        await q.query(`ALTER TABLE "org_nodes" ADD "management_mode" character varying(20)`);
        await q.query(`CREATE UNIQUE INDEX "UQ_org_nodes_code" ON "org_nodes" ("code") WHERE code IS NOT NULL AND deleted_at IS NULL`);
        await q.query(`UPDATE org_nodes SET management_mode = 'shared' WHERE parent_id IS NULL AND deleted_at IS NULL AND $1::uuid IS NOT NULL`, [group]);
    }

    private async addTemplate(q: QueryRunner): Promise<void> {
        for (const t of BUILT_IN) {
            await q.query(`UPDATE org_level_templates SET is_assignable = $2 WHERE code = $1`, [t.key, t.titles]);
        }
        const office = BUILT_IN[4]!;
        const rows: { id: string }[] = await q.query(
            `INSERT INTO org_level_templates (code, sort_order, is_active, is_assignable)
             SELECT $1::varchar, COALESCE(MAX(sort_order), 0) + 1, true, $2::boolean FROM org_level_templates
             HAVING NOT EXISTS (SELECT 1 FROM org_level_templates WHERE code = $1) AND COUNT(*) > 0
             RETURNING id`, [office.key, office.titles]);
        if (rows[0]) await q.query(`INSERT INTO org_level_template_translations (org_level_template_id, lang, name) VALUES ($1, 'ar', $2), ($1, 'en', $3)`, [rows[0].id, office.ar, office.en]);
    }

    private async grantKeys(q: QueryRunner): Promise<void> {
        for (const [table, holder] of Object.entries(GRANT_TABLES)) {
            await q.query(
                `INSERT INTO "${table}" ("${holder}", "permission_key", "scope")
                 SELECT h."${holder}", k.key, CASE WHEN k.key = 'org.view_full' THEN 'all' WHEN h.scope IN ('company', 'all') THEN h.scope ELSE 'company' END
                 FROM (SELECT DISTINCT ON ("${holder}") "${holder}", scope FROM "${table}" WHERE permission_key IN ('org.unit_update', 'org.levels_manage')
                       ORDER BY "${holder}", CASE scope WHEN 'all' THEN 0 ELSE 1 END) h
                 CROSS JOIN unnest($1::text[]) AS k(key)
                 ON CONFLICT DO NOTHING`, [NEW_KEYS]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of Object.keys(GRANT_TABLES)) await queryRunner.query(`DELETE FROM "${table}" WHERE permission_key = ANY($1)`, [NEW_KEYS]);
        await queryRunner.query(`DELETE FROM org_level_template_translations WHERE org_level_template_id IN (SELECT id FROM org_level_templates WHERE code = 'office')`);
        await queryRunner.query(`DELETE FROM org_level_templates WHERE code = 'office'`);
        await queryRunner.query(`DROP INDEX "public"."UQ_org_nodes_code"`);
        await queryRunner.query(`ALTER TABLE "org_nodes" DROP COLUMN "management_mode"`);
        await queryRunner.query(`ALTER TABLE "org_nodes" DROP COLUMN "code"`);
        await queryRunner.query(`DROP TABLE "org_level_parents"`);
        // Units of the office type or an added type cannot exist in the per-company shape; they go to the last built-in type.
        await queryRunner.query(`UPDATE org_nodes SET org_level_id = (SELECT id FROM org_levels WHERE template_code = 'unit' AND deleted_at IS NULL) WHERE org_level_id IN (SELECT id FROM org_levels WHERE template_code NOT IN ('sector', 'department', 'section', 'unit'))`);
        await queryRunner.query(`DELETE FROM org_levels WHERE template_code NOT IN ('sector', 'department', 'section', 'unit')`);
        await queryRunner.query(`DROP INDEX "public"."UQ_org_levels_key"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_org_levels_order"`);
        await queryRunner.query(`ALTER TABLE "org_levels" ALTER COLUMN "template_code" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "org_levels" DROP COLUMN "code_slot"`);
        await queryRunner.query(`ALTER TABLE "org_levels" DROP COLUMN "tone"`);
        await queryRunner.query(`ALTER TABLE "org_levels" DROP COLUMN "is_built_in"`);
        await queryRunner.query(`ALTER TABLE "org_levels" ADD "company_id" uuid`);
        const group = await this.groupCompany(queryRunner);
        await queryRunner.query(`UPDATE org_levels SET company_id = $1`, [group]);
        // Every other company gets its own copy of the group's types again.
        await queryRunner.query(`
            WITH copies AS (
                SELECT gen_random_uuid() AS new_id, l.id AS old_id, c.id AS company_id
                FROM org_levels l CROSS JOIN companies c WHERE l.deleted_at IS NULL AND c.deleted_at IS NULL AND c.id <> $1)
            INSERT INTO org_levels (id, company_id, sort_order, is_assignable, template_code, is_active)
            SELECT copies.new_id, copies.company_id, l.sort_order, l.is_assignable, l.template_code, l.is_active FROM copies JOIN org_levels l ON l.id = copies.old_id`, [group]);
        await queryRunner.query(`
            INSERT INTO org_level_translations (org_level_id, lang, name)
            SELECT n.id, t.lang, t.name FROM org_levels n JOIN org_levels o ON o.template_code = n.template_code AND o.company_id = $1 AND o.deleted_at IS NULL
            JOIN org_level_translations t ON t.org_level_id = o.id WHERE n.company_id <> $1`, [group]);
        await queryRunner.query(`ALTER TABLE "org_levels" ALTER COLUMN "company_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_org_levels_company" ON "org_levels" ("company_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_org_levels_company_order" ON "org_levels" ("company_id", "sort_order") WHERE deleted_at IS NULL`);
        await queryRunner.query(`ALTER TABLE "org_levels" ADD CONSTRAINT "FK_org_levels_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
