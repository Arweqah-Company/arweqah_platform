import { CorePermission } from '@arweqah-platform/shared';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, ConfirmDialog } from '@/shared/ui';
import { RoleGroupDialog } from './role-group-dialog';
import { useDeleteRoleGroup, useRoleGroups } from './role-groups.api';
import { UserGroupDialog } from './user-group-dialog';
import { useDeleteUserGroup, useUserGroups } from './user-groups.api';

type Open = 'new' | 'edit' | 'delete' | null;
type Kind = 'role-group' | 'user-group';

interface ViewProps {
  kind: Kind;
  keys: { create: string; update: string; delete: string };
  /** The chosen group's name, or null when none is chosen. */
  current: string | null;
  remove: () => Promise<unknown>;
  /** The form of one group (`edit`: the chosen one, otherwise a new one). */
  dialog: (mode: 'new' | 'edit', close: (savedId?: string) => void) => ReactNode;
  onSelect: (id: string) => void;
}

/** The buttons and dialogs to add, edit or delete a group, the same for both kinds. */
function GroupActionsView({ kind, keys, current, remove, dialog, onSelect }: ViewProps) {
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation();
  const [open, setOpen] = useState<Open>(null);
  const close = (savedId?: string) => {
    setOpen(null);
    if (savedId) onSelect(savedId);
  };
  const confirmDelete = async () => {
    try {
      await remove();
      toast.success(t('groupDeleted'));
      onSelect('');
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
    setOpen(null);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={keys.create}><Button variant="secondary" onClick={() => setOpen('new')}><Plus className="size-4" aria-hidden />{t(`newGroup.${kind}`)}</Button></Can>
      {current && <Can permission={keys.update}><Button variant="secondary" onClick={() => setOpen('edit')}>{t('editGroup')}</Button></Can>}
      {current && <Can permission={keys.delete}><Button variant="ghost" className="text-danger-text" onClick={() => setOpen('delete')}>{tc('actions.delete')}</Button></Can>}
      {(open === 'new' || open === 'edit') && dialog(open, close)}
      <ConfirmDialog open={open === 'delete'} onOpenChange={(o) => !o && setOpen(null)} tone="danger" title={t('deleteGroupTitle')} description={t(`deleteGroupBody.${kind}`, { name: current ?? '' })} confirmLabel={tc('actions.delete')} onConfirm={confirmDelete} />
    </div>
  );
}

interface Props {
  /** The group chosen on the page, if any. After a group is added or removed, the page follows it. */
  id: string;
  onSelect: (id: string) => void;
}

const nameOf = (language: string, group: { nameAr: string; nameEn: string } | undefined) => (group ? (language === 'ar' ? group.nameAr : group.nameEn) : null);

export function RoleGroupActions({ id, onSelect }: Props) {
  const { i18n } = useTranslation();
  const groups = useRoleGroups();
  const remove = useDeleteRoleGroup();
  const group = groups.data?.find((g) => g.id === id);
  const keys = { create: CorePermission.RoleGroupsCreate, update: CorePermission.RoleGroupsUpdate, delete: CorePermission.RoleGroupsDelete };
  return <GroupActionsView kind="role-group" keys={keys} current={nameOf(i18n.language, group)} remove={() => remove.mutateAsync(id)} onSelect={onSelect} dialog={(mode, close) => <RoleGroupDialog key={mode + id} group={mode === 'edit' ? (group ?? null) : null} onClose={close} />} />;
}

export function UserGroupActions({ id, onSelect }: Props) {
  const { i18n } = useTranslation();
  const groups = useUserGroups();
  const remove = useDeleteUserGroup();
  const group = groups.data?.find((g) => g.id === id);
  const keys = { create: CorePermission.UserGroupsCreate, update: CorePermission.UserGroupsUpdate, delete: CorePermission.UserGroupsDelete };
  return <GroupActionsView kind="user-group" keys={keys} current={nameOf(i18n.language, group)} remove={() => remove.mutateAsync(id)} onSelect={onSelect} dialog={(mode, close) => <UserGroupDialog key={mode + id} group={mode === 'edit' ? (group ?? null) : null} onClose={close} />} />;
}
