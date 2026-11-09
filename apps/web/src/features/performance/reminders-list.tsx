import { CorePermission, type ReminderDto } from '@arweqah-platform/shared';
import { BellRing, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Alert, Button, ConfirmDialog, DataTable, EmptyState, ListToolbar, RowAction } from '@/shared/ui';
import { useRemoveReminder, useUpdateReminder } from './api';
import { reminderColumns, reminderExportColumns, reminderFilters } from './reminder-columns';
import { ReminderDialog } from './reminder-dialog';
import { titleOf } from './reminder-text';

/** The row actions of a reminder: change it, switch it on or off, delete it. */
function ReminderActions({ reminder, onEdit, onRemove }: { reminder: ReminderDto; onEdit: () => void; onRemove: () => void }) {
  const { t, i18n } = useTranslation('performance');
  const update = useUpdateReminder();
  const name = titleOf(reminder, i18n.language);
  const toggle = () => update.mutate({ ...reminder, on: !reminder.on }, { onSuccess: () => toast.success(t(reminder.on ? 'reminders.stopped' : 'reminders.started')), onError: () => toast.error(t('reminders.failed')) });
  return (
    <Can permission={CorePermission.PerformanceRemindersManage}>
      <RowAction label={`${t('reminders.edit')}: ${name}`} icon={Pencil} onClick={onEdit} />
      <RowAction label={`${t(reminder.on ? 'reminders.stop' : 'reminders.start')}: ${name}`} icon={reminder.on ? PowerOff : Power} onClick={toggle} />
      <RowAction label={`${t('reminders.remove')}: ${name}`} icon={Trash2} danger onClick={onRemove} />
    </Can>
  );
}

/** The automatic reminders HR keeps, each with its kind, when it comes and its own words: add, change, switch on or off, delete. The sending is a later delivery. */
export function RemindersList({ reminders }: { reminders: ReminderDto[] }) {
  const { t, i18n } = useTranslation('performance');
  const list = useListPage('performance-reminders');
  const [dialog, setDialog] = useState<ReminderDto | 'new' | null>(null);
  const [removing, setRemoving] = useState<ReminderDto | null>(null);
  const remove = useRemoveReminder();
  const { kind, status } = list.filters.values;
  const rows = reminders.filter((r) => matchesText([r.titleAr, r.titleEn, r.bodyAr, r.bodyEn], list.term) && (!kind || r.kind === kind) && (!status || (status === 'on') === r.on));
  const exporting = { columns: reminderExportColumns(t, i18n.language), filename: 'performance-reminders', pageRows: rows, total: rows.length, loadAll: async () => rows };
  const toolbarActions = (
    <>
      <ExchangeButtons permissions={{ export: CorePermission.PerformanceRemindersExport }} exporting={exporting} />
      <Can permission={CorePermission.PerformanceRemindersManage}><Button variant="secondary" onClick={() => setDialog('new')}><Plus className="size-4" aria-hidden />{t('reminders.add')}</Button></Can>
    </>
  );
  return (
    <>
      <DataTable<ReminderDto>
        listKey="performance-reminders"
        caption={t('reminders.title')}
        title={t('reminders.title')}
        view={list.view}
        rows={rows}
        rowKey={(r) => r.id}
        columns={reminderColumns(t, i18n.language)}
        onRowClick={usePermissions().can(CorePermission.PerformanceRemindersManage) ? setDialog : undefined}
        toolbar={<ListToolbar listKey="performance-reminders" {...list.toolbar({ label: t('reminders.searchLabel'), placeholder: t('reminders.searchPlaceholder') }, reminderFilters(t))} actions={toolbarActions} />}
        actions={(r) => <ReminderActions reminder={r} onEdit={() => setDialog(r)} onRemove={() => setRemoving(r)} />}
        empty={<EmptyState icon={BellRing} title={list.narrowed ? t('reminders.noMatches') : t('reminders.empty')} />}
      />
      <p className="px-2 text-sm text-muted">{t('reminders.note')}</p>
      {dialog && <ReminderDialog reminder={dialog === 'new' ? null : dialog} onClose={() => setDialog(null)} />}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => { if (!o) { remove.reset(); setRemoving(null); } }} title={t('reminders.removeTitle')} description={removing ? titleOf(removing, i18n.language) : undefined} tone="danger" confirmLabel={t('reminders.remove')} busy={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id, { onSuccess: () => { toast.success(t('reminders.removed')); setRemoving(null); } }); }}>
        {remove.isError && <Alert tone="danger">{t('reminders.removeFailed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}
