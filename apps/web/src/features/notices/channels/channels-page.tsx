import { CorePermission, type NoticeChannelCode, type NoticeChannelDto } from '@arweqah-platform/shared';
import { Pencil, Plus, Power, PowerOff, Trash2, Users, Waypoints } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { Button, DataTable, EmptyState, ListToolbar, PageHeader, RowAction } from '@/shared/ui';
import { useChannels } from '../api';
import { AddWriterDialog } from './add-writer-dialog';
import { ChannelCommandDialog, type ChannelCommand } from './channel-commands';
import { ChannelFormDialog } from './channel-form-dialog';
import { filterChannels, useChannelColumns, useChannelExportColumns, useChannelFilterFields } from './channels-model';
import { SettingsCard } from './settings-card';
import { WritersDialog } from './writers-dialog';

interface RowProps { channel: NoticeChannelDto; open: () => void; rename: () => void; run: (kind: ChannelCommand['kind']) => void }

/** The icons of a channel's row, each for its key (a channel the person only reads has none): writers, rename, disable or enable, delete (only while it never had a notice). */
function RowActions({ channel, open, rename, run }: RowProps) {
  const { t } = useTranslation('notices');
  return (
    <>
      <RowAction label={t('channels.writersAction')} icon={Users} onClick={open} />
      {channel.canRename && <Can permission={CorePermission.NoticesChannelAdd}><RowAction label={t('channels.rename')} icon={Pencil} onClick={rename} /></Can>}
      {channel.canToggle && <Can permission={CorePermission.NoticesChannelRemove}><RowAction label={t(channel.isActive ? 'channels.disableAction' : 'channels.enableAction')} icon={channel.isActive ? PowerOff : Power} onClick={() => run('toggle')} /></Can>}
      {channel.canToggle && <Can permission={CorePermission.NoticesChannelRemove}><RowAction danger label={t(channel.canDelete ? 'channels.deleteAction' : 'channels.deleteBlocked')} icon={Trash2} disabled={!channel.canDelete} onClick={() => run('delete')} /></Can>}
    </>
  );
}

interface Handlers { writers: (code: NoticeChannelCode) => void; rename: (channel: NoticeChannelDto) => void; command: (command: ChannelCommand) => void }

/** The list of channels: search, the unit and state filters, the table / cards switch, the export; a click on a row opens its writers. */
function ChannelsTable({ create, on }: { create: ReactNode; on: Handlers }) {
  const { t } = useTranslation('notices');
  const channels = useChannels();
  const list = useListPage('notices-channels');
  const all = channels.data?.channels ?? [];
  const rows = filterChannels(all, list.term, list.filters.values);
  const exportColumns = useChannelExportColumns();
  const fields = useChannelFilterFields(all);
  const exporting = { columns: exportColumns, filename: 'notice-channels', pageRows: rows, total: rows.length, loadAll: () => Promise.resolve(rows) };
  return (
    <DataTable<NoticeChannelDto>
      listKey="notices-channels"
      caption={t('channels.pageTitle')}
      columns={useChannelColumns()}
      rows={channels.data ? rows : undefined}
      rowKey={(c) => c.code}
      isLoading={channels.isLoading}
      error={channels.error}
      view={list.view}
      toolbar={<ListToolbar listKey="notices-channels" {...list.toolbar({ label: t('channels.searchChannels'), placeholder: t('channels.searchChannels') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.NoticesChannelsExport }} exporting={exporting} />} />}
      onRowClick={(c) => on.writers(c.code)}
      actions={(c) => <RowActions channel={c} open={() => on.writers(c.code)} rename={() => on.rename(c)} run={(kind) => on.command({ kind, channel: c })} />}
      empty={<EmptyState icon={Waypoints} title={list.narrowed ? t('noMatches') : t('channels.empty')} description={list.narrowed ? undefined : t('channels.emptyHint')} action={list.narrowed ? undefined : create} />}
    />
  );
}

/** The batch settings (for whoever holds `notices.settings_edit`). */
function ChannelSettings() {
  const settings = useChannels().data?.settings;
  return settings?.canEdit ? <Can permission={CorePermission.NoticesSettingsEdit}><SettingsCard settings={settings} /></Can> : null;
}

/** «Publishing channels»: the channels of the units (any unit may have some), who writes in each, adding a channel, and the batch settings. */
export function ChannelsPage() {
  const { t } = useTranslation('notices');
  const channels = useChannels();
  const [form, setForm] = useState<{ channel: NoticeChannelDto | null } | null>(null);
  const [writersOf, setWritersOf] = useState<NoticeChannelCode | null>(null);
  const [adding, setAdding] = useState<NoticeChannelCode | null>(null);
  const [command, setCommand] = useState<ChannelCommand | null>(null);
  const all = channels.data?.channels ?? [];
  const create = <Can permission={CorePermission.NoticesChannelAdd}><Button onClick={() => setForm({ channel: null })}><Plus className="size-4" aria-hidden />{t('channels.add')}</Button></Can>;
  return (
    <>
      <PageHeader title={t('channels.pageTitle')} description={t('channels.pageDescription')} actions={channels.data?.canCreate ? create : undefined} />
      <div data-tour="main-list" className="flex flex-col gap-6">
        <ChannelsTable create={create} on={{ writers: setWritersOf, rename: (channel) => setForm({ channel }), command: setCommand }} />
        <ChannelSettings />
      </div>
      <WritersDialog code={writersOf} channels={all} onAdd={setAdding} onClose={() => setWritersOf(null)} />
      <AddWriterDialog channels={all} initial={adding} onClose={() => setAdding(null)} />
      <ChannelFormDialog open={!!form} channel={form?.channel ?? null} onClose={() => setForm(null)} />
      <ChannelCommandDialog command={command} onClose={() => setCommand(null)} />
    </>
  );
}
