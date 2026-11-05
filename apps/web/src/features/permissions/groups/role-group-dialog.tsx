import type { RoleGroupDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupDialogShell } from '@/shared/groups/group-dialog-shell';
import type { GroupNames } from '@/shared/groups/group-names-fields';
import { RolePicker } from './role-picker';
import { useSaveRoleGroup } from './role-groups.api';

const namesOf = (group: RoleGroupDto | null): GroupNames => (group ? { nameAr: group.nameAr, nameEn: group.nameEn, description: group.description ?? '' } : { nameAr: '', nameEn: '', description: '' });

/** A group of roles: its names, and which roles it bundles (given to a person, it gives them all of them). */
export function RoleGroupDialog({ group, onClose }: { group: RoleGroupDto | null; onClose: (savedId?: string) => void }) {
  const { t } = useTranslation('permissions', { keyPrefix: 'roleGroups' });
  const save = useSaveRoleGroup();
  const [names, setNames] = useState<GroupNames>(() => namesOf(group));
  const [roleIds, setRoleIds] = useState<string[]>(() => group?.roles.map((r) => r.id) ?? []);
  const submit = () => save.mutateAsync({ id: group?.id, input: { nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim(), description: names.description.trim() || undefined, roleIds } });
  return (
    <GroupDialogShell title={group ? t('edit') : t('new')} names={names} onNames={setNames} save={submit} savedText={t('saved')} error={save.error} busy={save.isPending} onClose={onClose}>
      <RolePicker value={roleIds} onChange={setRoleIds} />
    </GroupDialogShell>
  );
}
