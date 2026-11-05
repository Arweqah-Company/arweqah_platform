import { TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, type JobTitlesQuery, type OrgTreeNodeDto, type TitleTrack } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { FilterField } from '@/shared/ui';
import { useUnitsByType } from './api';

/** The kinds of unit a list of titles is narrowed by: a title in that unit or anywhere below it. */
const UNIT_FILTERS = [
  { id: 'sectorId', levelKey: 'sector', labelKey: 'filters.sector' },
  { id: 'departmentId', levelKey: 'department', labelKey: 'filters.department' },
  { id: 'sectionId', levelKey: 'section', labelKey: 'filters.section' },
] as const;

const GRADES = Array.from({ length: TITLE_GRADE_MAX - TITLE_GRADE_MIN + 1 }, (_, i) => TITLE_GRADE_MIN + i);

const unitOption = (ar: boolean) => (n: OrgTreeNodeDto) => ({ value: n.id, label: `${(ar ? n.nameAr : n.nameEn) || n.nameAr}${n.code ? ` (${n.code})` : ''}` });

/** Everything the list of job titles can be filtered by: the unit's sector, department and section, the grade, the track and whether anyone holds it. */
export function useTitleFilterFields(): FilterField[] {
  const { t, i18n } = useTranslation('job-titles');
  const nodes = useUnitsByType().data?.nodes ?? [];
  const units = UNIT_FILTERS.map((f): FilterField => ({ id: f.id, label: t(f.labelKey), type: 'select', options: nodes.filter((n) => n.levelKey === f.levelKey).map(unitOption(i18n.language === 'ar')) }));
  return [
    ...units,
    { id: 'grade', label: t('titles.grade'), type: 'select', options: GRADES.map((g) => ({ value: String(g), label: `L${g}` })) },
    { id: 'track', label: t('titles.track'), type: 'select', options: TITLE_TRACKS.map((x) => ({ value: x, label: t(`titles.tracks.${x}`) })) },
    { id: 'vacant', label: t('filters.vacant'), type: 'select', options: [{ value: 'true', label: t('filters.vacantYes') }, { value: 'false', label: t('filters.vacantNo') }] },
  ];
}

/** The filter values as the API's query; an empty value is left out. */
export function toTitlesQuery(values: FilterValues): Partial<Omit<JobTitlesQuery, 'page' | 'pageSize' | 'search'>> {
  const text = (id: string) => values[id] || undefined;
  return {
    sectorId: text('sectorId'),
    departmentId: text('departmentId'),
    sectionId: text('sectionId'),
    grade: values.grade ? Number(values.grade) : undefined,
    track: text('track') as TitleTrack | undefined,
    vacant: values.vacant ? values.vacant === 'true' : undefined,
  };
}
