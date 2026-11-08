import { CorePermission, type CareerTitleListItemDto } from '@arweqah-platform/shared';
import { Route } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { DataTable, EmptyState, ListToolbar, PageHeader } from '@/shared/ui';
import { useContentColumns } from './content-columns';
import { toContentQuery, useContentFilterFields } from './content-filters';
import { useLearningLinksImport } from './learning-links-import';
import { TitleDialogs, type TitleDialogState } from './title-dialogs';
import { TitleRowActions } from './title-row-actions';

/** The titles with the state of their career path: search, filters (state, unit, grade, track), table or cards, export; a click on a row previews the path. */
export function CareerContentPage() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-content');
  const fields = useContentFilterFields();
  const { columns, exportColumns } = useContentColumns();
  const importing = useLearningLinksImport();
  const [open, setOpen] = useState<TitleDialogState>(null);
  const { query, loadAll, table } = useServerList<CareerTitleListItemDto>('career-content', '/career/titles', list, { search: list.term || undefined, ...toContentQuery(list.filters.values) });
  const rows = query.data?.items ?? [];
  const exporting = { columns: exportColumns, filename: 'career-content', pageRows: rows, total: query.data?.total ?? 0, loadAll };
  return (
    <>
      <PageHeader title={t('content.title')} description={t('content.description')} />
      <DataTable<CareerTitleListItemDto>
        listKey="career-content"
        {...table}
        caption={t('content.title')}
        toolbar={<ListToolbar listKey="career-content" {...list.toolbar({ label: t('content.searchLabel'), placeholder: t('content.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.CareerContentExport, import: CorePermission.CareerContentImport }} exporting={exporting} importing={importing} />} />}
        rowKey={(x) => x.id}
        onRowClick={(x) => setOpen({ kind: 'workspace', title: x })}
        actions={(x) => <TitleRowActions title={x} first={x.id === rows[0]?.id} onOpen={setOpen} />}
        empty={<EmptyState icon={Route} title={list.narrowed ? t('content.noMatches') : t('content.empty')} />}
        columns={columns}
      />
      <TitleDialogs state={open} onClose={() => setOpen(null)} onOpen={setOpen} />
    </>
  );
}
