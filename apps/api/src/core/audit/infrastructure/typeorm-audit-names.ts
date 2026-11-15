import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuditText } from '@arweqah-platform/shared';
import { AuditNames } from '../domain/audit-names.port';

/**
 * One query over the places an id in the log can point to: people (by employee record or by account), roles and groups of roles, companies, units and
 * job titles (their Arabic and English names), tickets and tasks (by number). Ids that are in none of them stay unnamed. Parameterized, read-only.
 */
const NAMES = `
  SELECT e.id::text AS id, e.full_name AS ar, COALESCE(NULLIF(e.full_name_en, ''), e.full_name) AS en FROM employees e WHERE e.id = ANY($1::uuid[])
  UNION ALL SELECT e.user_id::text, e.full_name, COALESCE(NULLIF(e.full_name_en, ''), e.full_name) FROM employees e WHERE e.user_id = ANY($1::uuid[])
  UNION ALL SELECT r.id::text, r.name_ar, r.name_en FROM roles r WHERE r.id = ANY($1::uuid[])
  UNION ALL SELECT g.id::text, g.name_ar, g.name_en FROM role_groups g WHERE g.id = ANY($1::uuid[])
  UNION ALL SELECT t.company_id::text, max(t.name) FILTER (WHERE t.lang = 'ar'), max(t.name) FILTER (WHERE t.lang = 'en') FROM company_translations t WHERE t.company_id = ANY($1::uuid[]) GROUP BY t.company_id
  UNION ALL SELECT t.org_node_id::text, max(t.name) FILTER (WHERE t.lang = 'ar'), max(t.name) FILTER (WHERE t.lang = 'en') FROM org_node_translations t WHERE t.org_node_id = ANY($1::uuid[]) GROUP BY t.org_node_id
  UNION ALL SELECT t.job_title_id::text, max(t.name) FILTER (WHERE t.lang = 'ar'), max(t.name) FILTER (WHERE t.lang = 'en') FROM job_title_translations t WHERE t.job_title_id = ANY($1::uuid[]) GROUP BY t.job_title_id
  UNION ALL SELECT k.id::text, 'TKT-' || lpad(k.number::text, 6, '0'), 'TKT-' || lpad(k.number::text, 6, '0') FROM tickets k WHERE k.id = ANY($1::uuid[])
  UNION ALL SELECT k.id::text, 'TSK-' || lpad(k.number::text, 6, '0'), 'TSK-' || lpad(k.number::text, 6, '0') FROM tasks k WHERE k.id = ANY($1::uuid[])`;

interface NameRow {
  id: string;
  ar: string | null;
  en: string | null;
}

@Injectable()
export class TypeOrmAuditNames extends AuditNames {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async namesOf(ids: string[]): Promise<Map<string, AuditText>> {
    if (!ids.length) return new Map();
    const rows: NameRow[] = await this.ds.query(NAMES, [ids]);
    return new Map(rows.map((r) => [r.id, { ar: r.ar ?? r.en ?? '', en: r.en ?? r.ar ?? '' }]));
  }
}
