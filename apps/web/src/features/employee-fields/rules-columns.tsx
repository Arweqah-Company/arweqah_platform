import type { EmployeeFieldRuleDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { Lock } from 'lucide-react';
import type { ExportColumn } from '@/shared/data-exchange/types';
import type { Column } from '@/shared/ui';

export interface Draft {
  editableBySelf: boolean;
  editableByHr: boolean;
}

interface Options {
  t: TFunction;
  /** The label of a field in the language of the screen (the employee form's own words). */
  label: (field: string) => string;
  draft: (rule: EmployeeFieldRuleDto) => Draft;
  canEdit: boolean;
  onChange: (rule: EmployeeFieldRuleDto, patch: Partial<Draft>) => void;
}

const box = 'size-5 accent-petrol-800';

/** The columns of the page: the field, its group and the two choices (the person, HR). A field that can never be the person's has its box off and a lock. */
export function ruleColumns({ t, label, draft, canEdit, onChange }: Options): Column<EmployeeFieldRuleDto>[] {
  return [
    { id: 'field', header: t('columns.field'), cell: (r) => <span className="font-medium">{label(r.field)}</span> },
    { id: 'group', header: t('columns.group'), cell: (r) => t(`groups.${r.group}`) },
    {
      id: 'self',
      header: t('columns.self'),
      cell: (r) => (
        <span className="flex items-center gap-2">
          <input type="checkbox" className={box} aria-label={`${label(r.field)} · ${t('columns.self')}`} checked={draft(r).editableBySelf} disabled={!canEdit || r.selfLocked} onChange={(e) => onChange(r, { editableBySelf: e.target.checked })} />
          {r.selfLocked && <Lock className="size-4 text-muted" aria-label={t('selfLocked')} />}
        </span>
      ),
    },
    { id: 'hr', header: t('columns.hr'), cell: (r) => <input type="checkbox" className={box} aria-label={`${label(r.field)} · ${t('columns.hr')}`} checked={draft(r).editableByHr} disabled={!canEdit} onChange={(e) => onChange(r, { editableByHr: e.target.checked })} /> },
  ];
}

export function ruleExportColumns(t: TFunction, label: (field: string) => string, draft: (rule: EmployeeFieldRuleDto) => Draft): ExportColumn<EmployeeFieldRuleDto>[] {
  const yes = (v: boolean) => (v ? t('yes') : t('no'));
  return [
    { id: 'field', header: t('columns.field'), value: (r) => label(r.field) },
    { id: 'group', header: t('columns.group'), value: (r) => t(`groups.${r.group}`) },
    { id: 'self', header: t('columns.self'), value: (r) => yes(draft(r).editableBySelf) },
    { id: 'hr', header: t('columns.hr'), value: (r) => yes(draft(r).editableByHr) },
  ];
}
