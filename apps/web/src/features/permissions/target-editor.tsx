import { CorePermission, type PermissionGrant, type PermissionTargetKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { usePermissionCatalog, PermissionMatrix } from '@/features/roles';
import { errorMessage } from '@/shared/lib/error-message';
import { saveWithToast } from '@/shared/lib/use-save-toast';
import { Alert, Button, SectionCard } from '@/shared/ui';
import { useSaveTarget, useTarget } from './api';

/** The key that lets a person save permissions on each kind of target. */
const UPDATE_KEY: Record<PermissionTargetKind, string> = {
  role: CorePermission.PermissionsRoleUpdate,
  'role-group': CorePermission.PermissionsRoleGroupUpdate,
  user: CorePermission.PermissionsUserUpdate,
  'user-group': CorePermission.PermissionsUserGroupUpdate,
};

const sameFields = (a?: string[] | null, b?: string[] | null) => (a ?? []).length === (b ?? []).length && (a ?? []).every((f) => (b ?? []).includes(f));
/** Two lists of grants are the same when each key has the same reach and the same list of fields. */
const same = (a: PermissionGrant[], b: PermissionGrant[]) => a.length === b.length && a.every((x) => b.some((y) => y.key === x.key && y.scope === x.scope && sameFields(x.fields, y.fields)));

/** The permissions of one chosen target, with what reaches it from elsewhere shown beside them. */
export function TargetEditor({ kind, id }: { kind: PermissionTargetKind; id: string }) {
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation();
  const target = useTarget(kind, id);
  const catalog = usePermissionCatalog();
  const save = useSaveTarget(kind, id);
  const [draft, setDraft] = useState<PermissionGrant[] | null>(null);
  if (target.isError) return <Alert>{errorMessage(tc, target.error)}</Alert>;
  if (!target.data || !catalog.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  const grants = draft ?? target.data.permissions;
  const submit = saveWithToast(async (value: PermissionGrant[]) => { await save.mutateAsync(value); setDraft(null); }, t('saved'));
  return (
    <SectionCard id="matrix" title={t('matrixTitle')} description={t(`matrixHint.${kind}`)}>
      <form className="flex flex-col gap-4 sm:col-span-2" onSubmit={(e) => { e.preventDefault(); void submit(grants); }} noValidate>
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <PermissionMatrix catalog={catalog.data} grants={grants} inherited={target.data.inherited} onChange={setDraft} />
        <Can permission={UPDATE_KEY[kind]}>
          <div><Button type="submit" disabled={save.isPending || same(grants, target.data.permissions)}>{tc('actions.save')}</Button></div>
        </Can>
      </form>
    </SectionCard>
  );
}
