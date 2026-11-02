import { CorePermission, type RoleDto } from '@arweqah-platform/shared';
import { Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { Can, usePermissions } from '@/core/permissions/can';
import { ExceptionsTab } from '@/features/exceptions';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge, Button, DataTable, ListToolbar, PageHeader, RowAction, Tabs } from '@/shared/ui';
import { useDeleteRole, useRoles, useSyncAutoRoles } from './api';
import { RoleEditor } from './role-editor';
import { isDerivedRole, roleKind } from './role-kind';
import { matchesRoleFilters, roleExportColumns, roleFilterFields, roleOriginLabel } from './roles-list';

/** The roles list: its new-role and refresh buttons sit above the table, and a row opens the editor. */
function RolesTab() {
  const { t, i18n } = useTranslation('roles');
  const { t: tc } = useTranslation();
  const canUpdate = usePermissions().can(CorePermission.RolesUpdate);
  const roles = useRoles();
  const list = useListPage('roles');
  const fields = roleFilterFields(t, roles.data ?? [], i18n.language);
  const exportColumns = roleExportColumns(t, i18n.language);
  const rows = roles.data?.filter((r) => matchesRoleFilters(r, { term: list.term, filters: list.filters.values, language: i18n.language }));
  const remove = useDeleteRole();
  const sync = useSyncAutoRoles();
  const [editing, setEditing] = useState<{ role: RoleDto | null } | null>(null);
  const name = (r: RoleDto) => (i18n.language === 'ar' ? r.nameAr : r.nameEn);
  const originLabel = (r: RoleDto) => roleOriginLabel(r, i18n.language);

  const onDelete = async (role: RoleDto) => {
    if (!window.confirm(t('confirmDelete', { name: name(role) }))) return;
    try {
      await remove.mutateAsync(role.id);
      toast.success(t('deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  const onSync = async () => {
    try {
      const { changed } = await sync.mutateAsync();
      toast.success(changed ? t('sync.done', { count: changed }) : t('sync.unchanged'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Can permission={CorePermission.RolesSyncAuto}><Button variant="secondary" disabled={sync.isPending} onClick={() => void onSync()}><RefreshCw aria-hidden className="size-4" />{t('sync.button')}</Button></Can>
          <Can permission={CorePermission.RolesCreate}><Button onClick={() => setEditing({ role: null })}>{t('new')}</Button></Can>
      </div>
      <DataTable<RoleDto>
        listKey="roles"
        caption={t('title')}
        view={list.view}
        toolbar={<ListToolbar listKey="roles" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.RolesExport }} exporting={{ columns: exportColumns, filename: 'roles', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={roles.isPending}
        error={roles.error}
        rowKey={(r) => r.id}
        onRowClick={canUpdate ? (r) => setEditing({ role: r }) : undefined}
        actions={(r) => (
          <>
            <Can permission={CorePermission.RolesUpdate}><RowAction label={tc('actions.edit')} icon={Pencil} onClick={() => setEditing({ role: r })} /></Can>
            {!r.isSystem && !isDerivedRole(r) && <Can permission={CorePermission.RolesDelete}><RowAction label={tc('actions.delete')} icon={Trash2} danger onClick={() => void onDelete(r)} /></Can>}
          </>
        )}
        columns={[
          { id: 'name', header: t('nameAr'), cell: (r) => <span className="font-medium">{name(r)}</span> },
          { id: 'permissions', header: t('permissions'), cell: (r) => r.permissions.length },
          { id: 'origin', header: t('origin.label'), cell: (r) => <span className="text-muted">{originLabel(r) || '—'}</span> },
          { id: 'users', header: t('holders'), cell: (r) => <span className="text-muted">{t('users', { count: r.usersCount })}</span> },
          { id: 'assignment', header: t('assignment.label'), cell: (r) => <Badge tone={r.assignment === 'auto' ? 'success' : 'neutral'}>{t(`assignment.${r.assignment}`)}</Badge> },
          { id: 'kind', header: t('kind.label'), cell: (r) => <Badge tone={roleKind(r) === 'manual' ? 'neutral' : 'info'}>{t(`kind.${roleKind(r)}`)}</Badge> },
          { id: 'type', header: t('system'), hideHeader: true, cell: (r) => (r.isSystem ? <Badge tone="info">{t('system')}</Badge> : null) },
        ]}
      />
      {editing && <RoleEditor key={editing.role?.id ?? 'new'} role={editing.role} open onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}

const TABS = [
  { id: 'roles', view: CorePermission.RolesView, page: null, content: <RolesTab /> },
  { id: 'exceptions', view: CorePermission.ExceptionsView, page: 'exceptions' as const, content: <ExceptionsTab /> },
];

/** Roles, and next to them the exceptions: what was given outside the job title, with its end date. Each tab shows only to who may view it. */
export function RolesPage() {
  const { t } = useTranslation('roles');
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? [];
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((x) => can(x.view) && !(x.page && hidden.includes(x.page)));
  const current = tabs.find((x) => x.id === params.get('tab')) ?? tabs[0];
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      {current ? (
        <>
          {tabs.length > 1 && <Tabs tabs={tabs.map((x) => ({ id: x.id, label: t(`tabs.${x.id}`) }))} value={current.id} label={t('tabsLabel')} onChange={(id) => setParams({ tab: id }, { replace: true })} />}
          <div key={current.id}>{current.content}</div>
        </>
      ) : (
        <Alert tone="info">{t('noTabs')}</Alert>
      )}
    </>
  );
}
