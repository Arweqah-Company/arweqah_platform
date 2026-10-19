import { useTranslation } from 'react-i18next';
import { useRoles } from '@/features/roles';

export function RoleChecklist({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { t, i18n } = useTranslation('users');
  const roles = useRoles().data ?? [];
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{t('roles')}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.includes(r.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, r.id] : value.filter((id) => id !== r.id))}
            />
            {i18n.language === 'ar' ? r.nameAr : r.nameEn}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
