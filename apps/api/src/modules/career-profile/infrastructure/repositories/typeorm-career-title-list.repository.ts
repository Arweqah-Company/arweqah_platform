import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { CareerListStatus, CareerTitleListItemDto, CareerTitlesQuery, TitleTrack } from '@arweqah-platform/shared';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { CareerTitleListRepository } from '../../domain/contracts/career-title-list.repository';

interface Row {
  id: string;
  code: string | null;
  name_ar: string | null;
  name_en: string | null;
  unit_code: string | null;
  unit_ar: string | null;
  unit_en: string | null;
  grade: number | null;
  track: TitleTrack | null;
  status: CareerListStatus;
  version: number;
  holders: string;
  updated_at: Date | null;
  total: string;
}

/**
 * Every title, its unit, the state of its career path and the people holding it, in one parameterized query (a read model: it joins the
 * structure's tables, so it is raw SQL, covered by the API e2e on the real database). The search, the filters, the order and the page are
 * all in the query. A holder counts while the contract has not ended (the day is Riyadh's).
 */
const PAGE_SQL = `
SELECT j.id, j.code, j.grade, j.track, n.code AS unit_code,
  ja.name AS name_ar, COALESCE(je.name, ja.name) AS name_en, ua.name AS unit_ar, COALESCE(ue.name, ua.name) AS unit_en,
  COALESCE(c.status, 'none') AS status, COALESCE(c.version, 0) AS version, c.updated_at,
  (SELECT count(*) FROM employees e WHERE e.job_title_id = j.id AND e.deleted_at IS NULL
     AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date)) AS holders,
  count(*) OVER () AS total
FROM job_titles j
JOIN org_nodes n ON n.id = j.org_node_id AND n.deleted_at IS NULL
LEFT JOIN job_title_translations ja ON ja.job_title_id = j.id AND ja.lang = 'ar'
LEFT JOIN job_title_translations je ON je.job_title_id = j.id AND je.lang = 'en'
LEFT JOIN org_node_translations ua ON ua.org_node_id = n.id AND ua.lang = 'ar'
LEFT JOIN org_node_translations ue ON ue.org_node_id = n.id AND ue.lang = 'en'
LEFT JOIN career_title_content c ON c.title_id = j.id
WHERE j.deleted_at IS NULL
  AND ($1::text IS NULL OR ja.name ILIKE $1 OR je.name ILIKE $1 OR j.code ILIKE $1)
  AND ($2::text IS NULL OR COALESCE(c.status, 'none') = $2)
  AND ($3::int IS NULL OR j.grade = $3)
  AND ($4::text IS NULL OR j.track = $4)
  AND ($5::uuid IS NULL OR EXISTS (SELECT 1 FROM org_node_closure k WHERE k.descendant_id = j.org_node_id AND k.ancestor_id = $5))
ORDER BY j.code ASC NULLS LAST, ja.name ASC, j.id ASC
LIMIT $6 OFFSET $7`;

@Injectable()
export class TypeOrmCareerTitleListRepository extends CareerTitleListRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async page(query: CareerTitlesQuery): Promise<{ items: CareerTitleListItemDto[]; total: number }> {
    const rows: Row[] = await this.ds.query(PAGE_SQL, [
      query.search ? likeContains(query.search) : null,
      query.status ?? null,
      query.grade ?? null,
      query.track ?? null,
      query.orgNodeId ?? null,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    ]);
    return { items: rows.map(toItem), total: Number(rows[0]?.total ?? 0) };
  }
}

function toItem(r: Row): CareerTitleListItemDto {
  return {
    id: r.id, code: r.code, nameAr: r.name_ar ?? '', nameEn: r.name_en ?? r.name_ar ?? '', unitCode: r.unit_code, unitNameAr: r.unit_ar ?? '', unitNameEn: r.unit_en ?? r.unit_ar ?? '',
    grade: r.grade, track: r.track, status: r.status, version: Number(r.version), holders: Number(r.holders), updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}
