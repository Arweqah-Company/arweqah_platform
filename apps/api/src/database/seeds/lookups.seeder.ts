import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { insertRow } from '../../common/infrastructure/insert-row';
import { saveNames } from '../../common/infrastructure/translations';
import { COUNTRIES } from './data/countries.data';
import {
  CONTRACT_TYPES,
  GOSI_SYSTEMS,
  ID_TYPES,
  MARITAL_STATUSES,
  ORG_LEVEL_TEMPLATE,
  RELATION_TYPES,
  RESIDENCY_STATUSES,
  TERMINATION_REASONS,
  type SeedName,
} from './data/lookups.data';

interface TableSpec {
  table: string;
  translations: string;
  foreignKey: string;
}

const spec = (table: string, translations: string, foreignKey: string): TableSpec => ({ table, translations, foreignKey });

/** Seeds every option list the employee form uses. Idempotent: rows are matched by `code` and updated in place. */
@Injectable()
export class LookupsSeeder {
  constructor(private readonly db: DataSource) {}

  async run(): Promise<void> {
    await this.db.transaction(async (m) => {
      await this.simple(m, spec('relation_types', 'relation_type_translations', 'relation_type_id'), RELATION_TYPES);
      await this.simple(m, spec('marital_statuses', 'marital_status_translations', 'marital_status_id'), MARITAL_STATUSES);
      await this.simple(m, spec('residency_statuses', 'residency_status_translations', 'residency_status_id'), RESIDENCY_STATUSES);
      await this.simple(m, spec('gosi_systems', 'gosi_system_translations', 'gosi_system_id'), GOSI_SYSTEMS);
      await this.withFlags(m, spec('contract_types', 'contract_type_translations', 'contract_type_id'), CONTRACT_TYPES.map((c) => ({ ...c, flags: { requires_end_date: c.requiresEndDate, is_other: c.isOther } })));
      await this.withFlags(m, spec('termination_reasons', 'termination_reason_translations', 'termination_reason_id'), TERMINATION_REASONS.map((t) => ({ ...t, flags: { is_other: t.isOther } })));
      await this.withFlags(m, spec('org_level_templates', 'org_level_template_translations', 'org_level_template_id'), ORG_LEVEL_TEMPLATE.map((l) => ({ ...l, flags: { is_assignable: l.isAssignable } })));
      await this.idTypes(m);
      await this.countries(m);
    });
  }

  private simple(m: EntityManager, s: TableSpec, rows: SeedName[]): Promise<void> {
    return this.withFlags(m, s, rows.map((r) => ({ ...r, flags: {} })));
  }

  private async withFlags(m: EntityManager, s: TableSpec, rows: (SeedName & { flags: Record<string, boolean | string> })[]): Promise<void> {
    for (const [index, row] of rows.entries()) {
      const id = await this.upsert(m, s.table, { code: row.code, sort_order: index + 1, is_active: true, ...row.flags });
      await saveNames(m, { table: s.translations, foreignKey: s.foreignKey, parentId: id }, { nameAr: row.ar, nameEn: row.en });
    }
  }

  private async idTypes(m: EntityManager): Promise<void> {
    const s = spec('id_types', 'id_type_translations', 'id_type_id');
    for (const [index, type] of ID_TYPES.entries()) {
      const id = await this.upsert(m, s.table, { code: type.code, sort_order: index + 1, is_active: true, requires_country: type.requiresCountry });
      await saveNames(m, { table: s.translations, foreignKey: s.foreignKey, parentId: id }, { nameAr: type.ar, nameEn: type.en });
      const ruleId = await this.upsert(m, 'id_type_rules', {
        code: `${type.code}_default`, sort_order: 1, is_active: true, id_type_id: id, country_id: null,
        regex: type.rule.regex, min_length: type.rule.minLength, max_length: type.rule.maxLength,
      });
      await saveNames(m, { table: 'id_type_rule_translations', foreignKey: 'id_type_rule_id', parentId: ruleId }, { nameAr: type.rule.messageAr, nameEn: type.rule.messageEn });
    }
  }

  private async countries(m: EntityManager): Promise<void> {
    for (const [index, c] of COUNTRIES.entries()) {
      const id = await this.upsert(m, 'countries', { code: c.iso, sort_order: index + 1, is_active: true, iso_code: c.iso, currency_code: c.currency });
      for (const [lang, name, currencyName] of [['ar', c.nameAr, c.currencyNameAr], ['en', c.nameEn, c.currencyNameEn]] as const) {
        await insertRow(m, 'country_translations', { country_id: id, lang, name, currency_name: currencyName }, { conflict: ['country_id', 'lang'], update: ['name', 'currency_name'] });
      }
    }
  }

  /** Insert-or-update by the unique `code`; returns the row id. */
  private upsert(m: EntityManager, table: string, values: Record<string, unknown>): Promise<string> {
    return insertRow(m, table, values, { conflict: ['code'], update: Object.keys(values).filter((c) => c !== 'code') });
  }
}
