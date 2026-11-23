import { CorePermission, type NoticeChannelDto, type NoticeWriterDto } from '@arweqah-platform/shared';
import { Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { errorMessage } from '@/shared/lib/error-message';
import { matchesText } from '@/shared/lib/text-match';
import { Avatar, Button, ConfirmDialog, DataTable, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import { useRemoveWriter } from '../api';
import { useNoticeWords } from '../shared/notice-ui';

function useColumns(): Column<NoticeWriterDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const job = (w: NoticeWriterDto) => (w.jobTitle ? (words.ar ? w.jobTitle.nameAr : w.jobTitle.nameEn) : '');
  return [
    { id: 'writer', header: t('channels.writer'), className: 'min-w-48', cell: (w) => <span className="flex items-center gap-2"><Avatar name={w.name} size="sm" /><span className="flex flex-col"><span className="font-medium">{w.name}</span><span className="text-xs text-muted">{job(w)}</span></span></span> },
    { id: 'unit', header: t('channels.unit'), cell: (w) => words.unit(w.unit) },
    { id: 'addedAt', header: t('channels.addedAt'), className: 'whitespace-nowrap', cell: (w) => words.day(w.addedAt) },
  ];
}

function useExportColumns(): ExportColumn<NoticeWriterDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'writer', header: t('channels.writer'), value: (w) => w.name },
    { id: 'job', header: t('channels.jobTitle'), value: (w) => (w.jobTitle ? (words.ar ? w.jobTitle.nameAr : w.jobTitle.nameEn) : '') },
    { id: 'unit', header: t('channels.unit'), value: (w) => words.unit(w.unit) },
    { id: 'addedAt', header: t('channels.addedAt'), value: (w) => w.addedAt.slice(0, 10) },
  ];
}

function RemoveWriter({ channel, writer, onClose }: { channel: NoticeChannelDto; writer: NoticeWriterDto; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const remove = useRemoveWriter(channel.code);
  const confirm = async () => {
    try {
      await remove.mutateAsync(writer.userId);
      toast.success(t('channels.removed', { name: writer.name }));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
    onClose();
  };
  return (
    <ConfirmDialog open onOpenChange={(open) => !open && onClose()} title={t('channels.removeTitle', { name: writer.name })} description={t('channels.removeBody', { drafts: writer.drafts, pending: writer.pendingApproval })} confirmLabel={t('channels.removeButton')} tone="danger" busy={remove.isPending} onConfirm={() => void confirm()} />
  );
}

/** The writers of one channel (a small table with search, a unit filter and an export), opened from the channel's row. */
export function WritersPanel({ channel, onAdd }: { channel: NoticeChannelDto; onAdd: () => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const [removing, setRemoving] = useState<NoticeWriterDto | null>(null);
  const list = useListPage('notices-channel-writers');
  const columns = useColumns();
  const exportColumns = useExportColumns();
  const units = [...new Map(channel.writers.filter((w) => w.unit).map((w) => [w.unit?.id ?? '', w.unit])).values()];
  const rows = channel.writers.filter((w) => matchesText([w.name], list.term) && (!list.filters.get('unitId') || w.unit?.id === list.filters.get('unitId')));
  const fields = [{ id: 'unitId', label: t('channels.unit'), type: 'select' as const, options: units.map((u) => ({ value: u?.id ?? '', label: words.unit(u ?? null) })) }];
  const add = (
    <Can permission={CorePermission.NoticesWriterAdd}>
      {channel.canAddWriter && <Button variant="secondary" onClick={onAdd}><Plus className="size-4" aria-hidden />{t('channels.addWriter')}</Button>}
    </Can>
  );
  return (
    <div data-tour="channel-writers">
      <DataTable<NoticeWriterDto>
        caption={t('channels.writersOf', { name: words.channel(channel) })}
        columns={columns}
        rows={rows}
        rowKey={(w) => w.userId}
        view={list.view}
        toolbar={<ListToolbar {...list.toolbar({ label: t('channels.search'), placeholder: t('channels.search') }, fields)} actions={<><ExchangeButtons permissions={{ export: CorePermission.NoticesChannelsExport }} exporting={{ columns: exportColumns, filename: `notice-writers-${channel.code}`, pageRows: rows, total: rows.length, loadAll: () => Promise.resolve(rows) }} />{add}</>} />}
        actions={(w) => (w.canRemove ? <Can permission={CorePermission.NoticesWriterRemove}><RowAction danger label={t('channels.remove')} icon={Trash2} onClick={() => setRemoving(w)} /></Can> : null)}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('noMatches') : t('channels.noWriters')} action={add} />}
      />
      {removing && <RemoveWriter channel={channel} writer={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}
