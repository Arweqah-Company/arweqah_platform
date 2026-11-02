import { CorePermission, type JobTitleInput } from '@arweqah-platform/shared';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { usePermissions } from '@/core/permissions/can';
import { Button, FormField, Input, Select } from '@/shared/ui';
import { isDerivedRole, useRoles } from '../roles';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';

interface Props {
  rows: JobTitleInput[];
  onChange: (rows: JobTitleInput[]) => void;
  /** At least one title is mandatory: the last row cannot be removed. */
  minimum?: number;
}

interface RowProps {
  row: JobTitleInput;
  canRemove: boolean;
  onPatch: (change: Partial<JobTitleInput>) => void;
  onRemove: () => void;
}

/** Which role the permissions of the new title's role start with; the Employee role when none is chosen. */
function TemplateRoleSelect({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  const { t, i18n } = useTranslation('org');
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

function TitleRow({ row, canRemove, onPatch, onRemove }: RowProps) {
  const { t } = useTranslation('org');
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
      {canChooseTemplate && <div className="col-span-2"><TemplateRoleSelect value={row.templateRoleId} onChange={(templateRoleId) => onPatch({ templateRoleId })} /></div>}
    </div>
  );
}

/** Repeating Arabic/English name rows for job titles. */
export function JobTitleRows({ rows, onChange, minimum = 0 }: Props) {
  const { t } = useTranslation('org');
  const patch = (index: number, change: Partial<JobTitleInput>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <TitleRow key={index} row={row} canRemove={rows.length > minimum} onPatch={(change) => patch(index, change)} onRemove={() => onChange(rows.filter((_, i) => i !== index))} />
      ))}
      <Button variant="secondary" size="sm" className="self-start" onClick={() => onChange([...rows, { nameAr: '', nameEn: '' }])}><Plus className="size-4" />{t('titles.add')}</Button>
    </div>
  );
}

export const titleRowsValid = (rows: JobTitleInput[]): boolean => rows.every((r) => r.nameAr.trim().length >= 2 && r.nameEn.trim().length >= 2);
