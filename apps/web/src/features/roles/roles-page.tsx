import { CorePermission, type RoleDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, DataTable, PageHeader } from '@/shared/ui';
import { useDeleteRole, useRoles } from './api';
import { RoleEditor } from './role-editor';

export function RolesPage() {
  const { t, i18n } = useTranslation('roles');
  const { t: tc } = useTranslation();
  const roles = useRoles();
  const remove = useDeleteRole();
  const [editing, setEditing] = useState<{ role: RoleDto | null } | null>(null);
  const name = (r: RoleDto) => (i18n.language === 'ar' ? r.nameAr : r.nameEn);

  const onDelete = async (role: RoleDto) => {
    if (!window.confirm(t('confirmDelete', { name: name(role) }))) return;
    try {
      await remove.mutateAsync(role.id);
      toast.success(t('deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<Can permission={CorePermission.RolesManage}><Button onClick={() => setEditing({ role: null })}>{t('new')}</Button></Can>}
      />
      <DataTable<RoleDto>
        caption={t('title')}
        rows={roles.data}
        isLoading={roles.isPending}
        error={roles.error}
        rowKey={(r) => r.id}
        columns={[
          { id: 'name', header: t('nameAr'), cell: (r) => <span className="font-medium">{name(r)}</span> },
          { id: 'permissions', header: t('permissions'), cell: (r) => r.permissions.length },
          { id: 'users', header: tc('nav.users'), cell: (r) => <span className="text-muted">{t('users', { count: r.usersCount })}</span> },
          { id: 'type', header: t('system'), hideHeader: true, cell: (r) => (r.isSystem ? <Badge tone="gold">{t('system')}</Badge> : null) },
          {
            id: 'actions',
            header: tc('actions.edit'),
            hideHeader: true,
            className: 'w-40 text-end',
            cell: (r) => (
              <Can permission={CorePermission.RolesManage}>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ role: r })}>{tc('actions.edit')}</Button>
                {!r.isSystem && <Button size="sm" variant="ghost" className="text-danger-700" onClick={() => void onDelete(r)}>{tc('actions.delete')}</Button>}
              </Can>
            ),
          },
        ]}
      />
      {editing && <RoleEditor key={editing.role?.id ?? 'new'} role={editing.role} open onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
