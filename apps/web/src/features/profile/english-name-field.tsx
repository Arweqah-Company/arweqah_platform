import { CorePermission, ownProfileSchema, type EmployeeDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { useLiveError } from '@/shared/lib/live-validation';
import { Button, FormField, Input } from '@/shared/ui';
import { ownEditable } from './own-editable';
import { useSaveProfile } from './use-save-profile';

/** «Name in English» beside the Arabic name in the basic data: the one detail of that card the person changes themselves (profile.update), saved on its own. */
export function EnglishNameField({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('profile');
  const { save, pending } = useSaveProfile();
  const canUpdate = usePermissions().can(CorePermission.ProfileUpdate) && ownEditable(employee).has('fullNameEn');
  const [value, setValue] = useState(employee.fullNameEn ?? '');
  const parsed = ownProfileSchema.safeParse({ fullNameEn: value.trim() || null });
  const live = useLiveError(value, () => (parsed.success ? undefined : t('errors.fullNameEn')));
  const changed = value.trim() !== (employee.fullNameEn ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed.success) void save(parsed.data);
  };
  return (
    <form className="flex flex-col gap-2" onSubmit={submit} noValidate>
      <FormField label={t('basic.fullNameEn')} hint={t('basic.nameHint')} error={live.error} locked={canUpdate ? undefined : t('lock.notEditable')}>
        {(p) => <Input {...p} dir="ltr" readOnly={!canUpdate} onBlur={live.onBlur} value={value} onChange={(e) => setValue(e.target.value)} />}
      </FormField>
      {canUpdate && changed && <div><Button type="submit" size="sm" disabled={pending || !parsed.success}>{t('basic.saveNameEn')}</Button></div>}
    </form>
  );
}
