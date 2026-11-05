import { CorePermission, type RoleGroupDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { saveWithToast } from '@/shared/lib/use-save-toast';
import { Alert, Button, SectionCard } from '@/shared/ui';
import { RolePicker } from './role-picker';
import { useSaveRoleGroup } from './role-groups.api';

const same = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** The roles inside the chosen group, edited on the permissions page: everyone who holds one of them gets the permissions placed on the group. */
export function GroupRolesCard({ group }: { group: RoleGroupDto }) {
  const { t } = useTranslation('permissions', { keyPrefix: 'roleGroups' });
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const save = useSaveRoleGroup();
  const saved = group.roles.map((r) => r.id);
  const [draft, setDraft] = useState<string[] | null>(null);
  const ids = draft ?? saved;
  const submit = saveWithToast(async () => { await save.mutateAsync({ id: group.id, input: { nameAr: group.nameAr, nameEn: group.nameEn, description: group.description ?? undefined, roleIds: ids } }); setDraft(null); }, t('rolesSaved'));
  return (
    <SectionCard id="group-roles" title={t('rolesTitle')} description={t('rolesHint')}>
      <form className="flex flex-col gap-4 sm:col-span-2" onSubmit={(e) => { e.preventDefault(); void submit(ids); }} noValidate>
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <RolePicker value={ids} onChange={setDraft} disabled={!can(CorePermission.RoleGroupsUpdate)} />
        <Can permission={CorePermission.RoleGroupsUpdate}>
          <div><Button type="submit" disabled={save.isPending || same(ids, saved)}>{tc('actions.save')}</Button></div>
        </Can>
      </form>
    </SectionCard>
  );
}
