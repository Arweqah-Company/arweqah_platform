import type { PermissionScope, RoleDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input, Select } from '@/shared/ui';
import { usePermissionCatalog, useSaveRole } from './api';

interface Props {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Permission matrix: tick a permission, then choose how far it reaches. */
export function RoleEditor({ role, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('roles');
  const { t: tc } = useTranslation();
  const catalog = usePermissionCatalog();
  const save = useSaveRole();
  const [form, setForm] = useState<UpsertRoleInput>(() => ({
    nameAr: role?.nameAr ?? '',
    nameEn: role?.nameEn ?? '',
    description: role?.description ?? undefined,
    permissions: role?.permissions ?? [],
  }));
  const scopeOf = (key: string) => form.permissions.find((p) => p.key === key)?.scope;
  const setGrant = (key: string, scope: PermissionScope | null) =>
    setForm((f) => ({ ...f, permissions: [...f.permissions.filter((p) => p.key !== key), ...(scope ? [{ key, scope }] : [])] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ id: role?.id, input: form });
    toast.success(t('saved'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={role ? t('edit') : t('new')}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('nameAr')}>{(p) => <Input {...p} required minLength={2} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}</FormField>
          <FormField label={t('nameEn')}>{(p) => <Input {...p} required minLength={2} dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />}</FormField>
        </div>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-medium">{t('permissions')}</legend>
          {catalog.data?.map((group) => (
            <div key={group.module}>
              <h3 className="mb-1 text-xs font-bold text-muted">{t(`module.${group.module}`, { defaultValue: group.module })}</h3>
              <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
                {group.permissions.map((perm) => {
                  const scope = scopeOf(perm.key);
                  const label = i18n.language === 'ar' ? perm.labelAr : perm.labelEn;
                  return (
                    <li key={perm.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!scope} onChange={(e) => setGrant(perm.key, e.target.checked ? (perm.scopes.at(-1) ?? 'company') : null)} />
                        {label}
                      </label>
                      {scope && perm.scopes.length > 1 && (
                        <Select aria-label={`${t('scope')}: ${label}`} className="h-8 w-40" value={scope} onChange={(e) => setGrant(perm.key, e.target.value as PermissionScope)}>
                          {perm.scopes.map((s) => (
                            <option key={s} value={s}>{tc(`scope.${s}`)}</option>
                          ))}
                        </Select>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={save.isPending}>{tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
