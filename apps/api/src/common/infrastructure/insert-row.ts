import type { EntityManager } from 'typeorm';

/** snake_case column name to the camelCase entity property TypeORM expects for entity-backed tables. */
export const camel = (column: string): string => column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export interface UpsertOptions {
  /** Unique columns (database names) that identify the existing row. */
  conflict: string[];
  /** Columns (database names) overwritten when the row exists. */
  update: string[];
}

/**
 * Inserts a row given by database column names and returns its id. Entity-backed tables map values by
 * property name, so the keys are converted here once instead of at every call site.
 */
export async function insertRow(manager: EntityManager, table: string, values: Record<string, unknown>, upsert?: UpsertOptions): Promise<string> {
  const row = Object.fromEntries(Object.entries(values).map(([column, value]) => [camel(column), value]));
  const query = manager.createQueryBuilder().insert().into(table, Object.keys(row)).values(row).returning('id');
  if (upsert) query.orUpdate(upsert.update, upsert.conflict);
  const result = await query.execute();
  return (result.raw as { id: string }[])[0]?.id as string;
}
