import { CorePermission, TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, type TitleTrack } from '@arweqah-platform/shared';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { usePermissions } from '@/core/permissions/can';
import { Button, FormField, Input, Select } from '@/shared/ui';
import { isDerivedRole, useRoles } from '../roles';
import type { TitleRowInput } from './api';
import { ReportsToField } from './reports-to-field';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';

interface Props {
  rows: TitleRowInput[];
  onChange: (rows: TitleRowInput[]) => void;
  /** At least one title is mandatory: the last row cannot be removed. */
  minimum?: number;
  /** A new title in a unit needs its grade and its track (the title code is built from them). */
  grading?: boolean;
}

interface RowProps {
  row: TitleRowInput;
  grading: boolean;
  canRemove: boolean;
  onPatch: (change: Partial<TitleRowInput>) => void;
  onRemove: () => void;
}

/** Which role the permissions of the new title's role start with; the Employee role when none is chosen. */
function TemplateRoleSelect({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const roles = useRoles();
  const choices = (roles.data ?? []).filter((r) => !isDerivedRole(r));
  return (
    <FormField label={t('titles.template')} hint={t('titles.templateHint')}>
      {(p) => (
        <Select {...p} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">{t('titles.templateDefault')}</option>
          {choices.map((r) => <option key={r.id} value={r.id}>{i18n.language === 'ar' ? r.nameAr : r.nameEn}</option>)}
        </Select>
      )}
    </FormField>
  );
}

/** The grade (1 to 9) and the track of a title: together they make the middle of its code. */
export function GradeTrackFields({ grade, track, onChange }: { grade: number | undefined; track: TitleTrack | undefined; onChange: (change: { grade?: number; track?: TitleTrack }) => void }) {
  const { t } = useTranslation('job-titles');
  const grades = Array.from({ length: TITLE_GRADE_MAX - TITLE_GRADE_MIN + 1 }, (_, i) => TITLE_GRADE_MIN + i);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <FormField label={`${t('titles.grade')} *`}>
        {(p) => (
          <Select {...p} value={grade ? String(grade) : ''} onChange={(e) => onChange({ grade: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('titles.choose')}</option>
            {grades.map((g) => <option key={g} value={String(g)}>L{g}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={`${t('titles.track')} *`}>
        {(p) => (
          <Select {...p} value={track ?? ''} onChange={(e) => onChange({ track: (e.target.value || undefined) as TitleTrack | undefined })}>
            <option value="">{t('titles.choose')}</option>
            {TITLE_TRACKS.map((x) => <option key={x} value={x}>{t(`titles.tracks.${x}`)}</option>)}
          </Select>
        )}
      </FormField>
    </div>
  );
}

function TitleRow({ row, grading, canRemove, onPatch, onRemove }: RowProps) {
  const { t } = useTranslation('job-titles');
  const rules = useRules();
  const nameAr = useLiveError(row.nameAr, rules.text(2));
  const nameEn = useLiveError(row.nameEn, rules.text(2));
  const canChooseTemplate = usePermissions().can(CorePermission.RolesView);
  useAutoEnglish(row.nameAr, row.nameEn, (nameEn) => onPatch({ nameEn }));
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
      <FormField label={t('titles.nameAr')} error={nameAr.error}>{(p) => <Input {...p} onBlur={nameAr.onBlur} value={row.nameAr} onChange={(e) => onPatch({ nameAr: e.target.value })} />}</FormField>
      <FormField label={t('titles.nameEn')} error={nameEn.error}>{(p) => <Input {...p} dir="ltr" onBlur={nameEn.onBlur} value={row.nameEn} onChange={(e) => onPatch({ nameEn: e.target.value })} />}</FormField>
      <Button size="icon" variant="ghost" className="mt-7" aria-label={t('titles.remove')} disabled={!canRemove} onClick={onRemove}><X className="size-4" /></Button>
      {grading && <div className="col-span-2"><GradeTrackFields grade={row.grade} track={row.track} onChange={onPatch} /></div>}
      <div className="col-span-2"><ReportsToField value={row.reportsToTitleId} onChange={(reportsToTitleId) => onPatch({ reportsToTitleId })} /></div>
      {canChooseTemplate && <div className="col-span-2"><TemplateRoleSelect value={row.templateRoleId} onChange={(templateRoleId) => onPatch({ templateRoleId })} /></div>}
    </div>
  );
}

/** Repeating Arabic/English name rows for job titles. */
export function JobTitleRows({ rows, onChange, minimum = 0, grading = false }: Props) {
  const { t } = useTranslation('job-titles');
  const patch = (index: number, change: Partial<TitleRowInput>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <TitleRow key={index} row={row} grading={grading} canRemove={rows.length > minimum} onPatch={(change) => patch(index, change)} onRemove={() => onChange(rows.filter((_, i) => i !== index))} />
      ))}
      <Button variant="secondary" size="sm" className="self-start" onClick={() => onChange([...rows, { nameAr: '', nameEn: '' }])}><Plus className="size-4" />{t('titles.add')}</Button>
    </div>
  );
}

/** Names of 2 letters or more; with `grading`, the grade and the track too. */
export const titleRowsValid = (rows: TitleRowInput[], grading = false): boolean => rows.every((r) => r.nameAr.trim().length >= 2 && r.nameEn.trim().length >= 2 && (!grading || (!!r.grade && !!r.track)));
