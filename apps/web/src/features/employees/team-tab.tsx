import { CorePermission, type DirectoryEntryDto } from '@arweqah-platform/shared';
import { Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { DataTable, EmptyState, ListToolbar, RowAction } from '@/shared/ui';
import { useTeamColumns } from './team-columns';
import { toTeamQuery, useTeamFilterFields } from './team-filters';
import { TeamProfileDialog } from './team-profile-dialog';

/** Why the team is empty: no unit yet, nothing matches the search and filters, or nobody else shares the unit. */
function TeamEmpty({ hasUnit, narrowed }: { hasUnit: boolean; narrowed: boolean }) {
  const { t } = useTranslation('employees', { keyPrefix: 'team' });
  if (!hasUnit) return <EmptyState icon={Users} title={t('noUnit')} description={t('noUnitHint')} />;
  return <EmptyState icon={Users} title={narrowed ? t('noMatches') : t('empty')} />;
}

/** «My team» (FR-92): the active colleagues of the person's own unit with their basic details: search, company / title filters, table or cards, export. */
export function TeamTab() {
  const { t } = useTranslation('employees', { keyPrefix: 'team' });
  const list = useListPage('directory');
  const fields = useTeamFilterFields();
  const { columns, exportColumns } = useTeamColumns();
  const [openId, setOpenId] = useState<string | null>(null);
  const hasUnit = !!useMe().data?.placement.orgNodeId;
  const { query, loadAll, table } = useServerList<DirectoryEntryDto>('directory', '/directory', list, { search: list.term || undefined, ...toTeamQuery(list.filters.values) });
  const exchange = <ExchangeButtons permissions={{ export: CorePermission.DirectoryExport }} exporting={{ columns: exportColumns, filename: 'my-team', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />;

  return (
    <>
      <DataTable<DirectoryEntryDto>
        listKey="directory"
        {...table}
        caption={t('title')}
        toolbar={<ListToolbar listKey="directory" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={exchange} />}
        rowKey={(e) => e.id}
        onRowClick={(e) => setOpenId(e.id)}
        actions={(e) => <RowAction label={t('view')} icon={Eye} onClick={() => setOpenId(e.id)} />}
        empty={<TeamEmpty hasUnit={hasUnit} narrowed={list.narrowed} />}
        columns={columns}
      />
      {openId && <TeamProfileDialog id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
