import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ContractTypeLookupDto,
  CountryLookupDto,
  IdTypeLookupDto,
  IdTypeRuleDto,
  Language,
  LookupItemDto,
  OtherFlagLookupDto,
} from '@arweqah-platform/shared';
import { LookupsRepository, type ContractTypeRule, type IdTypeRules } from '../../domain/contracts/lookups.repository';

interface BaseRow {
  id: string;
  code: string;
  sortOrder: number;
  nameAr: string;
  nameEn: string;
}

type Extra = Record<string, string>;

@Injectable()
export class TypeOrmLookupsRepository extends LookupsRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  /** Reads one lookup table with its Arabic and English names; extra columns are added by the caller as `t.<col> AS "<alias>"`. */
  private async read(table: string, translations: string, foreignKey: string, extra: Extra = {}): Promise<(BaseRow & Record<string, unknown>)[]> {
    const qb = this.ds
      .createQueryBuilder()
      .from(table, 't')
      .leftJoin(translations, 'ta', `ta.${foreignKey} = t.id AND ta.lang = 'ar'`)
      .leftJoin(translations, 'te', `te.${foreignKey} = t.id AND te.lang = 'en'`)
      .select('t.id', 'id')
      .addSelect('t.code', 'code')
      .addSelect('t.sort_order', 'sortOrder')
      .addSelect('ta.name', 'nameAr')
      .addSelect('COALESCE(te.name, ta.name)', 'nameEn')
      .where('t.is_active = true')
      .orderBy('t.sort_order')
      .addOrderBy('ta.name');
    for (const [column, alias] of Object.entries(extra)) qb.addSelect(column, alias);
    return qb.getRawMany();
  }

  private static item(row: BaseRow, lang: Language): LookupItemDto {
    return { id: row.id, code: row.code, name: lang === 'en' ? row.nameEn : row.nameAr, nameAr: row.nameAr, nameEn: row.nameEn, sortOrder: Number(row.sortOrder) };
  }

  async relationTypes(lang: Language): Promise<LookupItemDto[]> {
    return (await this.read('relation_types', 'relation_type_translations', 'relation_type_id')).map((r) => TypeOrmLookupsRepository.item(r, lang));
  }

  async countries(lang: Language): Promise<CountryLookupDto[]> {
    const rows = await this.read('countries', 'country_translations', 'country_id', {
      't.iso_code': 'isoCode',
      't.currency_code': 'currencyCode',
      'ta.currency_name': 'currencyNameAr',
      'COALESCE(te.currency_name, ta.currency_name)': 'currencyNameEn',
    });
    return rows.map((r) => ({
      ...TypeOrmLookupsRepository.item(r, lang),
      isoCode: r.isoCode as string,
      currencyCode: r.currencyCode as string,
      currencyName: (lang === 'en' ? r.currencyNameEn : r.currencyNameAr) as string,
    }));
  }

  async maritalStatuses(lang: Language): Promise<LookupItemDto[]> {
    return (await this.read('marital_statuses', 'marital_status_translations', 'marital_status_id')).map((r) => TypeOrmLookupsRepository.item(r, lang));
  }

  async residencyStatuses(lang: Language): Promise<LookupItemDto[]> {
    return (await this.read('residency_statuses', 'residency_status_translations', 'residency_status_id')).map((r) => TypeOrmLookupsRepository.item(r, lang));
  }

  async idTypes(lang: Language): Promise<IdTypeLookupDto[]> {
    const [types, rules] = await Promise.all([this.read('id_types', 'id_type_translations', 'id_type_id', { 't.requires_country': 'requiresCountry' }), this.allIdTypeRules(lang)]);
    return types.map((r) => ({
      ...TypeOrmLookupsRepository.item(r, lang),
      requiresCountry: Boolean(r.requiresCountry),
      rules: rules.get(r.id) ?? [],
    }));
  }

  private async allIdTypeRules(lang: Language): Promise<Map<string, IdTypeRuleDto[]>> {
    const rows = await this.read('id_type_rules', 'id_type_rule_translations', 'id_type_rule_id', {
      't.id_type_id': 'idTypeId',
      't.country_id': 'countryId',
      't.regex': 'regex',
      't.min_length': 'minLength',
      't.max_length': 'maxLength',
    });
    const byType = new Map<string, IdTypeRuleDto[]>();
    for (const r of rows) {
      const rule: IdTypeRuleDto = {
        countryId: (r.countryId as string | null) ?? null,
        regex: r.regex as string,
        minLength: Number(r.minLength),
        maxLength: Number(r.maxLength),
        errorMessage: lang === 'en' ? r.nameEn : r.nameAr,
        errorMessageAr: r.nameAr,
        errorMessageEn: r.nameEn,
      };
      byType.set(r.idTypeId as string, [...(byType.get(r.idTypeId as string) ?? []), rule]);
    }
    return byType;
  }

  async contractTypes(lang: Language): Promise<ContractTypeLookupDto[]> {
    const rows = await this.read('contract_types', 'contract_type_translations', 'contract_type_id', {
      't.requires_end_date': 'requiresEndDate',
      't.is_other': 'isOther',
    });
    return rows.map((r) => ({ ...TypeOrmLookupsRepository.item(r, lang), requiresEndDate: Boolean(r.requiresEndDate), isOther: Boolean(r.isOther) }));
  }

  async gosiSystems(lang: Language): Promise<LookupItemDto[]> {
    return (await this.read('gosi_systems', 'gosi_system_translations', 'gosi_system_id')).map((r) => TypeOrmLookupsRepository.item(r, lang));
  }

  async terminationReasons(lang: Language): Promise<OtherFlagLookupDto[]> {
    const rows = await this.read('termination_reasons', 'termination_reason_translations', 'termination_reason_id', { 't.is_other': 'isOther' });
    return rows.map((r) => ({ ...TypeOrmLookupsRepository.item(r, lang), isOther: Boolean(r.isOther) }));
  }

  async contractTypeRule(id: string): Promise<ContractTypeRule | null> {
    const rows: { requires_end_date: boolean; is_other: boolean }[] = await this.ds.query('SELECT requires_end_date, is_other FROM contract_types WHERE id = $1', [id]);
    return rows[0] ? { requiresEndDate: rows[0].requires_end_date, isOther: rows[0].is_other } : null;
  }

  async idTypeRules(id: string): Promise<IdTypeRules | null> {
    const types: { requires_country: boolean }[] = await this.ds.query('SELECT requires_country FROM id_types WHERE id = $1', [id]);
    if (!types[0]) return null;
    const rules: { country_id: string | null; regex: string; min_length: number; max_length: number; ar: string | null; en: string | null }[] = await this.ds.query(
      `SELECT r.country_id, r.regex, r.min_length, r.max_length, ta.name AS ar, te.name AS en
       FROM id_type_rules r
       LEFT JOIN id_type_rule_translations ta ON ta.id_type_rule_id = r.id AND ta.lang = 'ar'
       LEFT JOIN id_type_rule_translations te ON te.id_type_rule_id = r.id AND te.lang = 'en'
       WHERE r.id_type_id = $1 AND r.is_active`,
      [id],
    );
    return {
      requiresCountry: types[0].requires_country,
      rules: rules.map((r) => ({
        countryId: r.country_id,
        regex: r.regex,
        minLength: r.min_length,
        maxLength: r.max_length,
        messageAr: r.ar ?? 'رقم الهوية غير صالح',
        messageEn: r.en ?? r.ar ?? 'Invalid ID number',
      })),
    };
  }

  async terminationReasonIsOther(id: string): Promise<boolean | null> {
    const rows: { is_other: boolean }[] = await this.ds.query('SELECT is_other FROM termination_reasons WHERE id = $1', [id]);
    return rows[0] ? rows[0].is_other : null;
  }
}
