import { PERMISSION_TARGET_KINDS, type PermissionTargetKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, FormField, PageHeader, Select } from '@/shared/ui';
import { useTargetOptions } from './api';
import { RoleGroupActions, UserGroupActions } from './groups/group-actions';
import { GroupRolesCard } from './groups/group-roles-card';
import { useRoleGroups } from './groups/role-groups.api';
import { TargetEditor } from './target-editor';
import { TargetSelect } from './target-select';

/** One page for all permissions: pick what they go on (a role, a group of roles, one person, a group of people), then set them. */
export function PermissionsPage() {
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const [kind, setKind] = useState<PermissionTargetKind>('role');
  const [id, setId] = useState('');
  const [search, setSearch] = useState('');
  const term = useDebounced(search, 250);
  const options = useTargetOptions(kind, term);
  const roleGroups = useRoleGroups();
  const chosenGroup = kind === 'role-group' ? roleGroups.data?.find((g) => g.id === id) : undefined;
  if (!active) return <Alert tone="info">{tc('adminMode.needed')}</Alert>;
  const change = (next: PermissionTargetKind) => { setKind(next); setId(''); setSearch(''); };
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div data-tour="main-list" className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('kind')} hint={t('kindHint')}>
            {(p) => (
              <Select {...p} value={kind} onChange={(e) => change(e.target.value as PermissionTargetKind)}>
                {PERMISSION_TARGET_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
              </Select>
            )}
          </FormField>
          <TargetSelect key={kind} kind={kind} value={id} options={options.data} loaded={options.isSuccess} onChange={setId} onSearch={setSearch} />
        </div>
        {kind === 'role-group' && <RoleGroupActions id={id} onSelect={setId} />}
        {kind === 'user-group' && <UserGroupActions id={id} onSelect={setId} />}
        {chosenGroup && <GroupRolesCard key={`roles-${chosenGroup.id}-${chosenGroup.roles.length}`} group={chosenGroup} />}
        {id && <TargetEditor key={`${kind}-${id}`} kind={kind} id={id} />}
      </div>
    </>
  );
}
