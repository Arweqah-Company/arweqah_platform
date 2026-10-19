import { CorePermission, type UserDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMe } from '@/core/auth/session';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, DataTable, Input, PageHeader, Select } from '@/shared/ui';
import { useSetActive, useUsers } from './api';
import { CreateUserDialog, EditAccessDialog } from './user-dialogs';

export function UsersPage() {
  const { t, i18n } = useTranslation('users');
  const { t: tc } = useTranslation();
  const meId = useMe().data?.id;
  const [query, setQuery] = useState<{ page: number; search?: string; status?: 'active' | 'inactive' }>({ page: 1 });
  const users = useUsers(query);
  const setActive = useSetActive();
  const [dialog, setDialog] = useState<{ type: 'create' } | { type: 'access'; user: UserDto } | null>(null);

  const toggleActive = async (u: UserDto) => {
    if (u.isActive && !window.confirm(t('confirmDeactivate', { name: u.name }))) return;
    try {
      await setActive.mutateAsync({ id: u.id, active: !u.isActive });
      toast.success(t('updated'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<Can permission={CorePermission.UsersManage}><Button onClick={() => setDialog({ type: 'create' })}>{t('new')}</Button></Can>}
      />
      <UserFilters onChange={(f) => setQuery({ ...query, ...f, page: 1 })} />
      <DataTable<UserDto>
        caption={t('title')}
        rows={users.data?.items}
        page={users.data}
        onPageChange={(page) => setQuery({ ...query, page })}
        isLoading={users.isPending}
        error={users.error}
        rowKey={(u) => u.id}
        columns={[
          {
            id: 'name',
            header: t('name'),
            cell: (u) => (
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="font-latin text-sm text-muted" dir="ltr">{u.email}</p>
              </div>
            ),
          },
          { id: 'roles', header: t('roles'), cell: (u) => u.roles.map((r) => (i18n.language === 'ar' ? r.nameAr : r.nameEn)).join('، ') || '—' },
          {
            id: 'status',
            header: t('status'),
            cell: (u) => (
              <span className="flex flex-wrap gap-1">
                <Badge tone={u.isActive ? 'success' : 'danger'}>{tc(u.isActive ? 'status.active' : 'status.inactive')}</Badge>
                {u.twoFactorEnabled && <Badge>{t('twoFactor')}</Badge>}
              </span>
            ),
          },
          {
            id: 'actions',
            header: tc('actions.edit'),
            hideHeader: true,
            className: 'w-56 text-end',
            cell: (u) =>
              u.id !== meId && (
                <Can permission={CorePermission.UsersManage}>
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ type: 'access', user: u })}>{t('editAccess')}</Button>
                  <Button size="sm" variant="ghost" className={u.isActive ? 'text-danger-700' : ''} onClick={() => void toggleActive(u)}>
                    {u.isActive ? t('deactivate') : t('activate')}
                  </Button>
                </Can>
              ),
          },
        ]}
      />
      {dialog?.type === 'create' && <CreateUserDialog onClose={() => setDialog(null)} />}
      {dialog?.type === 'access' && <EditAccessDialog user={dialog.user} onClose={() => setDialog(null)} />}
    </>
  );
}

type Filters = { search?: string; status?: 'active' | 'inactive' };

function UserFilters({ onChange }: { onChange: (f: Filters) => void }) {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation();
  const [filters, setFilters] = useState<Filters>({});
  const update = (next: Filters) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onChange(merged);
  };
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Input className="max-w-xs" type="search" aria-label={tc('table.search')} placeholder={t('searchPlaceholder')} onChange={(e) => update({ search: e.target.value || undefined })} />
      <Select className="w-44" aria-label={t('status')} onChange={(e) => update({ status: (e.target.value || undefined) as Filters['status'] })}>
        <option value="">{t('allStatuses')}</option>
        <option value="active">{tc('status.active')}</option>
        <option value="inactive">{tc('status.inactive')}</option>
      </Select>
    </div>
  );
}
