import { CAREER_LIST_STATUSES, TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, type CareerListStatus, type CareerTitlesQuery, type OrgTreeNodeDto, type TitleTrack } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { FilterField } from '@/shared/ui';

const GRADES = Array.from({ length: TITLE_GRADE_MAX - TITLE_GRADE_MIN + 1 }, (_, i) => TITLE_GRADE_MIN + i);

/** The units a list of titles can be narrowed to (a title in that unit or below it). HR holds the full-structure view, so every unit is offered. */
const useUnits = () =>
  useQuery({ queryKey: ['org', 'tree', 'full', null], staleTime: 60_000, queryFn: () => apiClient.get<{ nodes: OrgTreeNodeDto[] }>('/org/tree', { view: 'full' }) });

/** Everything the list can be filtered by: the state of the path, the unit, the grade and the track. */
export function useContentFilterFields(): FilterField[] {
  const { t, i18n } = useTranslation('career-profile');
  const ar = i18n.language === 'ar';
  const units = (useUnits().data?.nodes ?? []).map((n) => ({ value: n.id, label: `${(ar ? n.nameAr : n.nameEn) || n.nameAr}${n.code ? ` (${n.code})` : ''}` }));
  return [
    { id: 'status', label: t('content.columns.status'), type: 'select', options: CAREER_LIST_STATUSES.map((s) => ({ value: s, label: t(`content.status.${s}`) })) },
    { id: 'orgNodeId', label: t('content.columns.unit'), type: 'select', options: units },
    { id: 'grade', label: t('content.columns.grade'), type: 'select', options: GRADES.map((g) => ({ value: String(g), label: `L${g}` })) },
    { id: 'track', label: t('content.columns.track'), type: 'select', options: TITLE_TRACKS.map((x) => ({ value: x, label: t(`content.tracks.${x}`) })) },
  ];
}

/** The filter values as the API's query; an empty value is left out. */
export function toContentQuery(values: FilterValues): Partial<Omit<CareerTitlesQuery, 'page' | 'pageSize' | 'search'>> {
  return {
    status: (values.status || undefined) as CareerListStatus | undefined,
    orgNodeId: values.orgNodeId || undefined,
    grade: values.grade ? Number(values.grade) : undefined,
    track: (values.track || undefined) as TitleTrack | undefined,
  };
}
