import type { AudienceSets } from '../../domain/rules/notice-audience.rules';
import type { PeopleScope } from '../../domain/contracts/notice-channel.repository';

/**
 * Joins the fixed fragments of a statement (the shared SELECT, FROM and WHERE texts) that the repositories compose. Only text of the code goes through it: every value
 * the caller supplies is a numbered parameter (`$1`, bound by `Where`), never part of the text.
 */
export function sql(strings: TemplateStringsArray, ...fragments: string[]): string {
  return strings.reduce((text, part, i) => text + part + (fragments[i] ?? ''), '');
}

/** Builds a WHERE clause with numbered parameters: every value goes through `bind`, never into the text. */
export class Where {
  readonly values: unknown[] = [];
  private readonly clauses: string[] = [];

  /** Adds the value and answers its placeholder (`$3`). */
  bind(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  add(sql: string): this {
    this.clauses.push(sql);
    return this;
  }

  /** `column = value` when the value is given. */
  eq(column: string, value: unknown): this {
    return value === undefined ? this : this.add(`${column} = ${this.bind(value)}`);
  }

  /** The day range of a timestamp column in Riyadh time. */
  days(column: string, from?: string, until?: string): this {
    if (from) this.add(`(${column} AT TIME ZONE 'Asia/Riyadh')::date >= ${this.bind(from)}::date`);
    if (until) this.add(`(${column} AT TIME ZONE 'Asia/Riyadh')::date <= ${this.bind(until)}::date`);
    return this;
  }

  /** `columns` matched against `%text%` (the text taken literally). */
  search(columns: string[], like: string | undefined): this {
    if (!like) return this;
    const p = this.bind(like);
    return this.add(`(${columns.map((c) => `${c} ILIKE ${p}`).join(' OR ')})`);
  }

  get clause(): string {
    return this.clauses.length ? this.clauses.join(' AND ') : 'TRUE';
  }

  /** Values for a paged query: the filters' values, then the limit and the offset. */
  paged(page: number, pageSize: number): { values: unknown[]; limit: string; offset: string } {
    const values = [...this.values, pageSize, (page - 1) * pageSize];
    return { values, limit: `$${values.length - 1}`, offset: `$${values.length}` };
  }
}

export interface UnitColumns {
  /** The column of the unit the row belongs to, and of that unit's company. */
  unit: string;
  company: string;
}

/**
 * SQL for «inside this scope» over the unit of a row: all = everything, company = the units of the company, a unit-based scope = those units (in a unit managed per
 * company only the people of the viewer's company). The person's own rows are added by the caller.
 */
export function unitScopeSql(scope: PeopleScope, columns: UnitColumns, where: Where): string {
  if (scope.kind === 'all') return 'TRUE';
  if (scope.kind === 'none') return 'FALSE';
  if (scope.kind === 'company') return `${columns.company} = ${where.bind(scope.companyId)}`;
  const inUnits = `${columns.unit} = ANY(${where.bind([...scope.ids])})`;
  if (!scope.restrictedIds.length) return `(${inUnits})`;
  const sameCompany = scope.companyId ? ` OR ${columns.company} = ${where.bind(scope.companyId)}` : '';
  return `(${inUnits} AND (${columns.unit} <> ALL(${where.bind([...scope.restrictedIds])})${sameCompany}))`;
}

/** The condition of the audience rules over `employees e` (`$1`..`$5`: all, units with below, exact units, titles, groups). */
export const AUDIENCE_CONDITION = `(
  $1::boolean
  OR e.org_node_id IN (SELECT c.descendant_id FROM org_node_closure c WHERE c.ancestor_id = ANY($2::uuid[]))
  OR e.org_node_id = ANY($3::uuid[])
  OR e.job_title_id = ANY($4::uuid[])
  OR e.user_id IN (SELECT m.user_id FROM user_group_members m WHERE m.group_id = ANY($5::uuid[]))
)`;

/** The active employees of the audience: a live record, an active account, and an end date that has not passed. */
export const ACTIVE_AUDIENCE = `
  SELECT DISTINCT e.user_id FROM employees e JOIN users u ON u.id = e.user_id AND u.is_active
  WHERE e.deleted_at IS NULL AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date) AND ${AUDIENCE_CONDITION}`;

export const audienceParams = (sets: AudienceSets): unknown[] => [sets.all, sets.unitsWithBelow, sets.unitsExact, sets.titles, sets.groups];
