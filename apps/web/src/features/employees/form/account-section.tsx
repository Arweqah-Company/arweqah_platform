import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRoles } from '@/features/roles';
import { SectionCard } from '@/shared/ui';
import type { FormState } from './form-state';

/** Roles given at creation (create only, for those who may assign roles). Later changes use the roles dialog. */
export function AccountSection() {
  const { t, i18n } = useTranslation('employees');
  const { control } = useFormContext<FormState>();
  const roles = useRoles();
  return (
    <SectionCard id="account" title={t('sections.account')} description={t('hints.roles')}>
      <Controller
        control={control}
        name="roleIds"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="sr-only">{t('sections.account')}</legend>
            {(roles.data ?? []).filter((r) => !r.autoRule).map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-petrol-800"
                  checked={field.value.includes(role.id)}
                  onChange={(e) => field.onChange(e.target.checked ? [...field.value, role.id] : field.value.filter((id) => id !== role.id))}
                />
                {i18n.language === 'en' ? role.nameEn : role.nameAr}
              </label>
            ))}
          </fieldset>
        )}
      />
    </SectionCard>
  );
}
