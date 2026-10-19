import type { PlacementInput } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useOrgTree } from '@/features/org';
import { FormField, Select } from '@/shared/ui';

/** Branch → department → team pickers that only offer consistent choices. */
export function PlacementFields({ value, onChange }: { value: PlacementInput; onChange: (p: PlacementInput) => void }) {
  const { t, i18n } = useTranslation('users');
  const tree = useOrgTree().data;
  const label = (u: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? u.nameAr : u.nameEn);
  const branch = tree?.branches.find((b) => b.id === value.branchId);
  const department = branch?.departments.find((d) => d.id === value.departmentId);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormField label={t('branch')}>
        {(p) => (
          <Select {...p} value={value.branchId ?? ''} onChange={(e) => onChange({ ...value, branchId: e.target.value || null, departmentId: null, teamId: null })}>
            <option value="">{t('none')}</option>
            {tree?.branches.map((b) => <option key={b.id} value={b.id}>{label(b)}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('department')}>
        {(p) => (
          <Select {...p} disabled={!branch} value={value.departmentId ?? ''} onChange={(e) => onChange({ ...value, departmentId: e.target.value || null, teamId: null })}>
            <option value="">{t('none')}</option>
            {branch?.departments.map((d) => <option key={d.id} value={d.id}>{label(d)}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('team')}>
        {(p) => (
          <Select {...p} disabled={!department} value={value.teamId ?? ''} onChange={(e) => onChange({ ...value, teamId: e.target.value || null })}>
            <option value="">{t('none')}</option>
            {department?.teams.map((tm) => <option key={tm.id} value={tm.id}>{label(tm)}</option>)}
          </Select>
        )}
      </FormField>
    </div>
  );
}
