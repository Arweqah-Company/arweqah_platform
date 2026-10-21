import type { EntityManager, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { insertRow } from './insert-row';

export interface LocalizedName {
  nameAr: string;
  nameEn: string;
}

/** Where the translated names of an entity live: `<table>_translations` rows keyed by `foreignKey`. */
export interface TranslationSpec {
  table: string;
  foreignKey: string;
}

const LANGS = [
  { lang: 'ar', key: 'nameAr' },
  { lang: 'en', key: 'nameEn' },
] as const;

/** Joins the Arabic and English rows as `<alias>_ar` / `<alias>_en` (alias defaults to the parent alias). */
export function joinNames<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  source: TranslationSpec & { parentAlias: string; alias?: string },
): SelectQueryBuilder<T> {
  const alias = source.alias ?? source.parentAlias;
  for (const { lang } of LANGS) {
    qb.leftJoin(source.table, `${alias}_${lang}`, `${alias}_${lang}.${source.foreignKey} = ${source.parentAlias}.id AND ${alias}_${lang}.lang = '${lang}'`);
  }
  return qb;
}

/** Selects the joined names as `nameAr` / `nameEn` (Arabic is the fallback for English). */
export function selectNames<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, alias: string): SelectQueryBuilder<T> {
  return qb.addSelect(`${alias}_ar.name`, 'nameAr').addSelect(`COALESCE(${alias}_en.name, ${alias}_ar.name)`, 'nameEn');
}

/** Inserts or updates both language rows of an entity (idempotent). */
export async function saveNames(manager: EntityManager, target: TranslationSpec & { parentId: string }, names: LocalizedName): Promise<void> {
  for (const { lang, key } of LANGS) {
    await insertRow(manager, target.table, { [target.foreignKey]: target.parentId, lang, name: names[key] }, { conflict: [target.foreignKey, 'lang'], update: ['name'] });
  }
}
