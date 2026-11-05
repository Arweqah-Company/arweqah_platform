import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormField, MultiCombobox } from '@/shared/ui';
import { useTargetOptions } from '../api';

/** The roles of a group: a searchable list of the existing roles to add from, and the chosen ones as chips that can be taken out again. */
export function RolePicker({ value, onChange, disabled }: { value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const { t, i18n } = useTranslation('permissions', { keyPrefix: 'roleGroups' });
  // The permissions page's own list of roles: an editor of groups needs `permissions.view`, not `roles.view`.
  const roles = useTargetOptions('role', '').data ?? [];
  const name = (r: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? r.nameAr : r.nameEn);
  const chosen = roles.filter((r) => value.includes(r.id));
  const options = roles.map((r) => ({ value: r.id, label: name(r) }));
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <FormField label={t('addRole')} hint={t('addRoleHint')}>
        {(p) => <MultiCombobox {...p} label={t('addRole')} values={value} options={options} placeholder={t('pickRole')} disabled={disabled} onChange={onChange} />}
      </FormField>
      <p className="text-sm font-medium">{t('chosenRoles', { count: chosen.length })}</p>
      {chosen.length === 0 ? <p className="text-sm text-muted">{t('noRolesYet')}</p> : (
        <ul className="flex flex-wrap gap-2" aria-label={t('roles')}>
          {chosen.map((r) => (
            <li key={r.id} className="inline-flex items-center gap-1 rounded-full bg-petrol-50 py-1 ps-3 pe-1 text-sm">
              {name(r)}
              {!disabled && <button type="button" aria-label={t('removeRole', { name: name(r) })} className="grid size-6 place-items-center rounded-full hover:bg-petrol-800/10" onClick={() => onChange(value.filter((id) => id !== r.id))}><X className="size-3" aria-hidden /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
