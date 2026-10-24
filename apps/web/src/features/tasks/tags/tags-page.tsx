import { CorePermission, type TaskTagAdminDto } from '@arweqah-platform/shared';
import { Pencil, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { errorMessage } from '@/shared/lib/error-message';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';
import { useRemoveTag, useTags } from '../api';
import { TagDialog } from './tag-dialog';

/** Each department keeps its own tags for tasks ("reports", "meetings"); a department that has none yet shows an empty list. */
export function TagsPage() {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const canUpdate = usePermissions().can(CorePermission.TasksTagUpdate);
  const tags = useTags();
  const remove = useRemoveTag();
  const list = useListPage('task-tags');
  const [editing, setEditing] = useState<{ tag: TaskTagAdminDto | null } | null>(null);
  const [deleting, setDeleting] = useState<TaskTagAdminDto | null>(null);
  const fields: FilterField[] = [{ id: 'status', label: t('tags.status'), type: 'select', options: [{ value: 'active', label: tc('status.active') }, { value: 'inactive', label: tc('status.inactive') }] }];
  const rows = tags.data?.filter((x) => matchesText([x.nameAr, x.nameEn, x.departmentNameAr, x.departmentNameEn], list.term) && (!list.filters.values.status || x.isActive === (list.filters.values.status === 'active')));
  const name = (x: TaskTagAdminDto) => (ar ? x.nameAr : x.nameEn);
  const exportColumns: ExportColumn<TaskTagAdminDto>[] = [
    { id: 'nameAr', header: t('tags.nameAr'), value: (x) => x.nameAr },
    { id: 'nameEn', header: t('tags.nameEn'), value: (x) => x.nameEn },
    { id: 'department', header: t('tags.department'), value: (x) => (ar ? x.departmentNameAr : x.departmentNameEn) },
    { id: 'status', header: t('tags.status'), value: (x) => tc(x.isActive ? 'status.active' : 'status.inactive') },
  ];
  const confirmDelete = async () => {
    try {
      await remove.mutateAsync((deleting as TaskTagAdminDto).id);
      toast.success(t('tags.deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      setDeleting(null);
    }
  };
  return (
    <>
      <PageHeader title={t('tags.title')} description={t('tags.description')} actions={<Can permission={CorePermission.TasksTagCreate}><Button onClick={() => setEditing({ tag: null })}>{t('tags.new')}</Button></Can>} />
      <DataTable<TaskTagAdminDto>
        listKey="task-tags"
        caption={t('tags.title')}
        view={list.view}
        toolbar={<ListToolbar listKey="task-tags" {...list.toolbar({ label: t('tags.searchLabel'), placeholder: t('tags.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.TasksExport }} exporting={{ columns: exportColumns, filename: 'task-tags', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={tags.isPending}
        error={tags.error}
        rowKey={(x) => x.id}
        onRowClick={canUpdate ? (x) => setEditing({ tag: x }) : undefined}
        actions={(x) => (
          <>
            <Can permission={CorePermission.TasksTagUpdate}><RowAction label={tc('actions.edit')} icon={Pencil} onClick={() => setEditing({ tag: x })} /></Can>
            <Can permission={CorePermission.TasksTagDelete}><RowAction label={tc('actions.delete')} icon={Trash2} danger onClick={() => setDeleting(x)} /></Can>
          </>
        )}
        empty={<EmptyState icon={Tag} title={list.narrowed ? t('noMatches') : t('tags.empty')} description={list.narrowed ? undefined : t('tags.emptyHint')} />}
        columns={[
          { id: 'name', header: t('tags.name'), cell: (x) => <span className="font-medium">{name(x)}</span> },
          { id: 'department', header: t('tags.department'), cell: (x) => (ar ? x.departmentNameAr : x.departmentNameEn) },
          { id: 'status', header: t('tags.status'), cell: (x) => <Badge tone={x.isActive ? 'success' : 'neutral'}>{tc(x.isActive ? 'status.active' : 'status.inactive')}</Badge> },
        ]}
      />
      {editing && <TagDialog tag={editing.tag} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} tone="danger" title={t('tags.deleteTitle')} description={deleting ? t('tags.deleteBody', { name: name(deleting) }) : undefined} confirmLabel={tc('actions.delete')} onConfirm={confirmDelete} />
    </>
  );
}
