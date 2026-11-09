import { LEARNING_PRIORITIES, type CareerContent } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { UNIT_STATES, type UnitState } from './proof-status';
import type { FilterField } from '@/shared/ui';

export type LearningUnit = CareerContent['learning']['periods'][number]['units'][number];
export interface LearningRow extends LearningUnit {
  period: string;
  /** The employee's progress on the unit; left out in a preview (nobody's progress). */
  state?: UnitState;
}

type Filters = Record<string, string | undefined>;

/** The units of one period that the search and the filters (priority, language) keep. */
export function filterUnits(units: readonly LearningRow[], term: string, filters: Filters): LearningRow[] {
  return units.filter((u) => matchesText([u.title, u.provider], term) && (!filters.priority || u.priority === filters.priority) && (!filters.language || u.language === filters.language) && (!filters.state || (u.state ?? 'todo') === filters.state));
}

export function learningFilterFields(t: TFunction<'career-profile'>, units: readonly LearningRow[], withState = false): FilterField[] {
  const languages = [...new Set(units.map((u) => u.language))];
  const state: FilterField[] = withState ? [{ id: 'state', label: t('learning.columns.state'), type: 'select', options: UNIT_STATES.map((x) => ({ value: x, label: t(`proof.state.${x}`) })) }] : [];
  return [
    { id: 'priority', label: t('learning.columns.priority'), type: 'select', options: LEARNING_PRIORITIES.map((p) => ({ value: p, label: p })) },
    { id: 'language', label: t('learning.columns.language'), type: 'select', options: languages.map((l) => ({ value: l, label: l })) },
    ...state,
  ];
}

export function learningExportColumns(t: TFunction<'career-profile'>, withState = false): ExportColumn<LearningRow>[] {
  return [
    { id: 'period', header: t('learning.columns.period'), value: (u) => u.period },
    { id: 'priority', header: t('learning.columns.priority'), value: (u) => u.priority },
    { id: 'unit', header: t('learning.columns.unit'), value: (u) => u.title },
    { id: 'provider', header: t('learning.columns.provider'), value: (u) => u.provider },
    { id: 'duration', header: t('learning.columns.duration'), value: (u) => u.duration },
    { id: 'minutes', header: t('learning.columns.minutes'), value: (u) => u.minutes },
    { id: 'language', header: t('learning.columns.language'), value: (u) => u.language },
    { id: 'link', header: t('learning.columns.link'), value: (u) => u.link },
    ...(withState ? [{ id: 'state', header: t('learning.columns.state'), value: (u: LearningRow) => t(`proof.state.${u.state ?? 'todo'}`) }] : []),
  ];
}
