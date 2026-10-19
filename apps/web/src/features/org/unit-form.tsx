import type { DepartmentDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input, Select } from '@/shared/ui';
import { useSaveOrgUnit, type OrgUnitKind } from './api';

export interface UnitTarget {
  kind: OrgUnitKind;
  branchId?: string;
  departmentId?: string;
  /** Departments of the branch, offered as parents. */
  siblings?: DepartmentDto[];
}

/** One form for the three unit kinds; only the fields of the chosen kind are shown. */
export function UnitForm({ target, onClose }: { target: UnitTarget; onClose: () => void }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const save = useSaveOrgUnit();
  const [v, setV] = useState({ nameAr: '', nameEn: '', code: '', city: '', parentId: '' });
  const titles = { branch: t('addBranch'), department: t('addDepartment'), team: t('addTeam') };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const names = { nameAr: v.nameAr, nameEn: v.nameEn };
    if (target.kind === 'branch') await save.mutateAsync({ kind: 'branch', input: { ...names, code: v.code, city: v.city || undefined } });
    if (target.kind === 'department')
      await save.mutateAsync({ kind: 'department', input: { ...names, branchId: target.branchId ?? '', parentId: v.parentId || null } });
    if (target.kind === 'team') await save.mutateAsync({ kind: 'team', input: { ...names, departmentId: target.departmentId ?? '' } });
    toast.success(t('saved'));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={titles[target.kind]}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <FormField label={t('nameAr')}>{(p) => <Input {...p} required minLength={2} value={v.nameAr} onChange={(e) => setV({ ...v, nameAr: e.target.value })} />}</FormField>
        <FormField label={t('nameEn')}>{(p) => <Input {...p} required minLength={2} dir="ltr" value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} />}</FormField>
        {target.kind === 'branch' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('code')} hint={t('codeHint')}>
              {(p) => <Input {...p} required pattern="[A-Z0-9-]{2,20}" dir="ltr" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />}
            </FormField>
            <FormField label={t('city')}>{(p) => <Input {...p} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />}</FormField>
          </div>
        )}
        {target.kind === 'department' && !!target.siblings?.length && (
          <FormField label={t('parent')}>
            {(p) => (
              <Select {...p} value={v.parentId} onChange={(e) => setV({ ...v, parentId: e.target.value })}>
                <option value="">{t('none')}</option>
                {target.siblings?.map((d) => <option key={d.id} value={d.id}>{i18n.language === 'ar' ? d.nameAr : d.nameEn}</option>)}
              </Select>
            )}
          </FormField>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={save.isPending}>{tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
