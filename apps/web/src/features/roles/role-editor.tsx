import type { RoleDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, FormField, Input, Select } from '@/shared/ui';
import { usePermissionCatalog, useSaveRole } from './api';
import { PermissionMatrix } from './permission-matrix';

interface Props {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const namesOk = (form: UpsertRoleInput) => form.nameAr.trim().length >= 2 && form.nameEn.trim().length >= 2;

/** In their own component so "touched" starts fresh every time the dialog opens. */
function RoleNames({ form, onChange }: { form: UpsertRoleInput; onChange: (change: Partial<UpsertRoleInput>) => void }) {
  const { t } = useTranslation('roles');
  const rules = useRules();
  const nameAr = useLiveError(form.nameAr, rules.text(2));
  const nameEn = useLiveError(form.nameEn, rules.text(2));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={t('nameAr')} error={nameAr.error}>{(p) => <Input {...p} aria-required onBlur={nameAr.onBlur} value={form.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} />}</FormField>
      <FormField label={t('nameEn')} error={nameEn.error}>{(p) => <Input {...p} aria-required dir="ltr" onBlur={nameEn.onBlur} value={form.nameEn} onChange={(e) => onChange({ nameEn: e.target.value })} />}</FormField>
    </div>
  );
}

const NEW_ROLE: UpsertRoleInput = { nameAr: '', nameEn: '', assignment: 'manual', permissions: [] };
const initialForm = (role: RoleDto | null): UpsertRoleInput =>
  role ? { nameAr: role.nameAr, nameEn: role.nameEn, description: role.description ?? undefined, assignment: role.assignment, permissions: role.permissions } : NEW_ROLE;

/** Permission matrix: tick a permission, then choose how far it reaches. */
export function RoleEditor({ role, open, onOpenChange }: Props) {
  const { t } = useTranslation('roles');
  const { t: tc } = useTranslation();
  const catalog = usePermissionCatalog();
  const save = useSaveRole();
  const [form, setForm] = useState<UpsertRoleInput>(() => initialForm(role));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ id: role?.id, input: form });
    toast.success(t('saved'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={role ? t('edit') : t('new')}>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <RoleNames form={form} onChange={(change) => setForm((f) => ({ ...f, ...change }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('roleDescription')}>{(p) => <Input {...p} maxLength={500} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />}</FormField>
          <FormField label={t('assignment.label')} hint={role?.autoRule ? t('assignment.ruleHint') : t('assignment.hint')}>
            {(p) => (
              <Select {...p} disabled={!!role?.autoRule} value={form.assignment} onChange={(e) => setForm((f) => ({ ...f, assignment: e.target.value as 'auto' | 'manual' }))}>
                <option value="manual">{t('assignment.manual')}</option>
                <option value="auto">{t('assignment.auto')}</option>
              </Select>
            )}
          </FormField>
        </div>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-medium">{t('permissions')}</legend>
          <PermissionMatrix catalog={catalog.data ?? []} grants={form.permissions} onChange={(permissions) => setForm((f) => ({ ...f, permissions }))} />
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={save.isPending || !namesOk(form)}>{tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
