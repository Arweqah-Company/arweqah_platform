import { CorePermission, type RoleDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { matchesText } from '@/shared/lib/text-match';
import { Badge, Button, DataTable, ListToolbar, PageHeader, type FilterField } from '@/shared/ui';
import { useDeleteRole, useRoles } from './api';
import { RoleEditor } from './role-editor';

export function RolesPage() {
  const { t, i18n } = useTranslation('roles');
  const { t: tc } = useTranslation();
  const roles = useRoles();
  const list = useListPage('roles');
  const fields: FilterField[] = [
    { id: 'type', label: t('filters.type'), type: 'select', options: [{ value: 'system', label: t('system') }, { value: 'custom', label: t('filters.custom') }] },
    { id: 'assignment', label: t('assignment.label'), type: 'select', options: [{ value: 'auto', label: t('assignment.auto') }, { value: 'manual', label: t('assignment.manual') }] },
    { id: 'holders', label: t('holders'), type: 'select', options: [{ value: 'with', label: t('filters.withHolders') }, { value: 'without', label: t('filters.withoutHolders') }] },
  ];
  const exportColumns: ExportColumn<RoleDto>[] = [
    { id: 'nameAr', header: t('nameAr'), value: (r) => r.nameAr },
    { id: 'nameEn', header: t('nameEn'), value: (r) => r.nameEn },
    { id: 'description', header: t('descriptionColumn'), value: (r) => r.description },
    { id: 'assignment', header: t('assignment.label'), value: (r) => t(`assignment.${r.assignment}`) },
    { id: 'type', header: t('filters.type'), value: (r) => (r.isSystem ? t('system') : t('filters.custom')) },
    { id: 'permissions', header: t('permissions'), value: (r) => r.permissions.length },
    { id: 'holders', header: t('holders'), value: (r) => r.usersCount },
  ];
  const rows = roles.data?.filter(
    (r) =>
      matchesText([r.nameAr, r.nameEn, r.description], list.term) &&
      (!list.filters.values.type || r.isSystem === (list.filters.values.type === 'system')) &&
      (!list.filters.values.assignment || r.assignment === list.filters.values.assignment) &&
      (!list.filters.values.holders || (r.usersCount > 0) === (list.filters.values.holders === 'with')),
  );
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
        actions={<Can permission={CorePermission.RolesCreate}><Button onClick={() => setEditing({ role: null })}>{t('new')}</Button></Can>}
      />
      <DataTable<RoleDto>
        listKey="roles"
        caption={t('title')}
        view={list.view}
        toolbar={<ListToolbar listKey="roles" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.RolesExport }} exporting={{ columns: exportColumns, filename: 'roles', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={roles.isPending}
        error={roles.error}
        rowKey={(r) => r.id}
        columns={[
          { id: 'name', header: t('nameAr'), cell: (r) => <span className="font-medium">{name(r)}</span> },
          { id: 'permissions', header: t('permissions'), cell: (r) => r.permissions.length },
          { id: 'users', header: t('holders'), cell: (r) => <span className="text-muted">{t('users', { count: r.usersCount })}</span> },
          { id: 'assignment', header: t('assignment.label'), cell: (r) => <Badge tone={r.assignment === 'auto' ? 'success' : 'neutral'}>{t(`assignment.${r.assignment}`)}</Badge> },
          { id: 'type', header: t('system'), hideHeader: true, cell: (r) => (r.isSystem ? <Badge tone="info">{t('system')}</Badge> : null) },
          {
            id: 'actions',
            header: tc('actions.edit'),
            hideHeader: true,
            className: 'w-40 text-end',
            cell: (r) => (
              <>
                <Can permission={CorePermission.RolesUpdate}><Button size="sm" variant="ghost" onClick={() => setEditing({ role: r })}>{tc('actions.edit')}</Button></Can>
                {!r.isSystem && <Can permission={CorePermission.RolesDelete}><Button size="sm" variant="ghost" className="text-danger-text" onClick={() => void onDelete(r)}>{tc('actions.delete')}</Button></Can>}
              </>
            ),
          },
        ]}
      />
      {editing && <RoleEditor key={editing.role?.id ?? 'new'} role={editing.role} open onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
