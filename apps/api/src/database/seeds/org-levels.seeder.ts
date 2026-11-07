import { Injectable, Logger } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { BUILT_IN_UNIT_TYPES, DEFAULT_PARENT_RULES, ROOT_PARENT, UNIT_TYPE } from '@arweqah-platform/shared';
import { DEFAULT_STAGE_RULES } from '../../modules/org/domain/rules/development-stage.rules';
import { insertRow } from '../../common/infrastructure/insert-row';
import { saveNames } from '../../common/infrastructure/translations';
import { ORG_LEVEL_TEMPLATE } from './data/lookups.data';

/** The slot each built-in type takes in a unit code; the office takes the slot where it sits. */
const CODE_SLOT: Record<string, number | null> = { [UNIT_TYPE.Sector]: 1, [UNIT_TYPE.Department]: 2, [UNIT_TYPE.Section]: 3, [UNIT_TYPE.Unit]: 4, [UNIT_TYPE.Office]: null };

/**
 * Makes sure the group has its five built-in unit types and, on a database that has no rules at all yet, the default
 * «who may be created under whom» table and the default development-stage rules. Idempotent: a type that exists (renamed, or with its titles flag changed by an
 * administrator) and a rules table that someone edited are left alone.
 */
@Injectable()
export class OrgLevelsSeeder {
  private readonly logger = new Logger('Seed');

  constructor(private readonly db: DataSource) {}

  async run(): Promise<void> {
    await this.db.transaction(async (m) => {
      for (const key of BUILT_IN_UNIT_TYPES) await this.ensureType(m, key);
      await this.ensureRules(m);
      await this.ensureStageRules(m);
    });
  }

  private async ensureType(m: EntityManager, key: string): Promise<void> {
    if ((await m.query('SELECT 1 FROM org_levels WHERE template_code = $1 AND deleted_at IS NULL', [key])).length > 0) return;
    const template = ORG_LEVEL_TEMPLATE.find((t) => t.code === key);
    if (!template) return;
    const [{ next }] = await m.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM org_levels WHERE deleted_at IS NULL');
    const id = await insertRow(m, 'org_levels', { sort_order: next, is_assignable: template.isAssignable, template_code: key, is_built_in: true, tone: key, code_slot: CODE_SLOT[key] ?? null });
    await saveNames(m, { table: 'org_level_translations', foreignKey: 'org_level_id', parentId: id }, { nameAr: template.ar, nameEn: template.en });
    this.logger.log(`Unit type created: ${key}`);
  }

  private async ensureRules(m: EntityManager): Promise<void> {
    if ((await m.query('SELECT 1 FROM org_level_parents LIMIT 1')).length > 0) return;
    await this.insertDefaultRules(m);
  }

  /** Adds every default «who may sit under whom» pair that is missing; used before the group's structure is built, which needs them all (an office directly under the group, for one). */
  async ensureDefaultRules(): Promise<void> {
    await this.db.transaction((m) => this.insertDefaultRules(m));
  }

  private async insertDefaultRules(m: EntityManager): Promise<void> {
    const pairs = Object.entries(DEFAULT_PARENT_RULES).flatMap(([parent, children]) => children.map((child) => [parent, child] as const));
    await m.query(
      `INSERT INTO org_level_parents (parent_level_id, child_level_id)
       SELECT p.id, c.id FROM unnest($1::text[], $2::text[]) AS r(parent_key, child_key)
       JOIN org_levels c ON c.template_code = r.child_key AND c.deleted_at IS NULL
       LEFT JOIN org_levels p ON p.template_code = r.parent_key AND p.deleted_at IS NULL
       WHERE r.parent_key = $3 OR p.id IS NOT NULL
       ON CONFLICT DO NOTHING`,
      [pairs.map(([parent]) => parent), pairs.map(([, child]) => child), ROOT_PARENT],
    );
  }

  /** The starting rules of the development stage by grade and track; once the table has rows, HR's edits are never overwritten. */
  private async ensureStageRules(m: EntityManager): Promise<void> {
    if ((await m.query('SELECT 1 FROM development_stage_rules LIMIT 1')).length > 0) return;
    await m.query(
      'INSERT INTO development_stage_rules (grade, track, stage) SELECT * FROM unnest($1::smallint[], $2::text[], $3::text[])',
      [DEFAULT_STAGE_RULES.map((r) => r.grade), DEFAULT_STAGE_RULES.map((r) => r.track), DEFAULT_STAGE_RULES.map((r) => r.stage)],
    );
  }
}
