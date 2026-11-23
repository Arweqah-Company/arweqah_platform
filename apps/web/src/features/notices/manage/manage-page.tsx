import { CorePermission, NOTICE_MANAGE_TABS, type NoticeListItemDto, type NoticeManageTab, type NoticesPageDto } from '@arweqah-platform/shared';
import { Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, EmptyState, ListToolbar, PageHeader, Tabs } from '@/shared/ui';
import { useAudienceOptions, useNoticeOptions } from '../api';
import { NoticeRowActions } from './row-actions';
import { toManageQuery, useManageColumns, useManageExportColumns, useManageFilterFields } from './manage-model';
import { useNoticeCommands } from './notice-commands';

interface Sort { key: string; dir: 'asc' | 'desc' }

/** A link from the home page may open the list on a tab (`?tab=mine`). */
function useTabFromLink(): NoticeManageTab {
  const [params] = useSearchParams();
  const link = params.get('tab') ?? '';
  return (NOTICE_MANAGE_TABS as readonly string[]).includes(link) ? (link as NoticeManageTab) : 'all';
}

/** «Manage notices»: the writer's and the leader's list (tabs by stage), with the row icons each key allows. No import: a notice is written and approved, not made from a file. */
export function ManageNoticesPage() {
  const { t } = useTranslation('notices');
  const [tab, setTab] = useState<NoticeManageTab>(useTabFromLink());
  const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' });
  const commands = useNoticeCommands();
  const list = useListPage('notices-manage');
  const fields = useManageFilterFields(useNoticeOptions().data, useAudienceOptions().data?.units);
  const columns = useManageColumns();
  const exportColumns = useManageExportColumns();
  const query = { tab, sort: sort.key, dir: sort.dir, search: list.term || undefined, ...toManageQuery(list.filters.values) };
  const { query: result, loadAll, table } = useServerList<NoticeListItemDto>('notices-manage', '/notices', list, query);
  const counts = (result.data as NoticesPageDto | undefined)?.counts;
  const tabOf = (id: NoticeManageTab) => ({ id, label: t(`manageTabs.${id}`), count: id === 'mine' || id === 'pending' ? counts?.[id] : undefined });
  const toggleSort = (key: string) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const create = <Can permission={CorePermission.NoticesCreate}><Button onClick={() => commands.run('new')}><Plus className="size-4" aria-hidden />{t('manage.new')}</Button></Can>;
  return (
    <>
      <PageHeader title={t('manage.title')} description={t('manage.description')} actions={create} />
      <Tabs tabs={NOTICE_MANAGE_TABS.map(tabOf)} value={tab} label={t('manage.tabsLabel')} onChange={(next) => { setTab(next); list.setPage(1); }} />
      <DataTable<NoticeListItemDto>
        listKey="notices-manage"
        {...table}
        caption={t('manage.title')}
        sort={sort}
        onSort={toggleSort}
        toolbar={
          <ListToolbar
            listKey="notices-manage"
            {...list.toolbar({ label: t('manage.searchLabel'), placeholder: t('manage.searchPlaceholder') }, fields)}
            actions={<ExchangeButtons permissions={{ export: CorePermission.NoticesExport }} exporting={{ columns: exportColumns, filename: 'notices', pageRows: result.data?.items ?? [], total: result.data?.total ?? 0, loadAll }} />}
          />
        }
        rowKey={(x) => x.id}
        columns={columns}
        onRowClick={(x) => commands.run(x.abilities.edit ? 'edit' : 'view', x)}
        actions={(x) => <NoticeRowActions notice={x} run={commands.run} />}
        empty={<EmptyState icon={Megaphone} title={list.narrowed ? t('noMatches') : t('manage.empty')} action={<Can permission={CorePermission.NoticesCreate}><Button onClick={() => commands.run('new')}>{t('manage.new')}</Button></Can>} />}
      />
      {commands.dialogs}
    </>
  );
}
