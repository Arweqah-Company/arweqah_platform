import { CALIBRATION_ADJUSTED, CorePermission, type CalibrationPageDto, type CalibrationRowDto } from '@arweqah-platform/shared';
import { Scale, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, DataTable, EmptyState, ListToolbar, RowAction, type FilterField } from '@/shared/ui';
import { AdjustDialog } from './adjust-dialog';
import { useCalibrationColumns } from './calibration-columns';
import { CalibrationDistribution } from './calibration-distribution';

/** The filters (level, stage, adjusted or not); the levels are those of the grade scale the server sent. */
function useFields(levels: string[]): FilterField[] {
  const { t } = useTranslation('performance');
  return [
    { id: 'level', label: t('calibration.filters.level'), type: 'select', options: levels.map((l) => ({ value: l, label: l })) },
    { id: 'stage', label: t('calibration.filters.stage'), type: 'select', options: [1, 2, 3, 4, 5].map((s) => ({ value: String(s), label: t('calibration.stageN', { n: s }) })) },
    { id: 'adjusted', label: t('calibration.filters.adjusted'), type: 'select', options: CALIBRATION_ADJUSTED.map((a) => ({ value: a, label: t(`calibration.adjusted.${a}`) })) },
  ];
}

/** The server's query for the search and the filters (an empty filter is left out). */
function paramsOf(term: string, v: Record<string, string>) {
  const some = (x: string | undefined) => x || undefined;
  return { search: some(term), level: some(v.level), stage: some(v.stage), adjusted: some(v.adjusted) };
}

/** What the export reads: the shown page, the whole count, and the loader of every row. */
const exportingOf = (page: CalibrationPageDto | undefined, columns: ReturnType<typeof useCalibrationColumns>['exportColumns'], loadAll: () => Promise<CalibrationRowDto[]>) => ({ columns, filename: 'performance-calibration', pageRows: page?.items ?? [], total: page?.total ?? 0, loadAll });

/** The page the server answered for the search and the filters. */
export function useCalibrationList() {
  const list = useListPage('performance-calibration');
  const params = paramsOf(list.term, list.filters.values);
  const { query, loadAll, table } = useServerList<CalibrationRowDto>('performance-calibration', '/performance/calibration', list, params);
  const page = query.data as CalibrationPageDto | undefined;
  const { columns, exportColumns } = useCalibrationColumns();
  const fields = useFields((page?.distribution ?? []).map((d) => d.levelName));
  return { list, query, table, page, columns, fields, exporting: exportingOf(page, exportColumns, loadAll) };
}

/** The notice of no cycle, the distribution of the levels and the notice of those still waiting for their manager. */
function Overview({ page, loading }: { page: CalibrationPageDto | undefined; loading: boolean }) {
  const { t } = useTranslation('performance');
  return (
    <>
      {!page?.cycle && !loading && <Alert tone="info">{t('calibration.noCycle')}</Alert>}
      {page && <CalibrationDistribution distribution={page.distribution} />}
      {!!page?.waitingCount && <Alert tone="warning">{t('calibration.waitingCount', { count: page.waitingCount })}</Alert>}
    </>
  );
}

/** The row's own action: open the adjustment (only in the calibration stage, and only when the manager's score is there). */
function AdjustAction({ row, open, onAdjust }: { row: CalibrationRowDto; open: boolean; onAdjust: (row: CalibrationRowDto) => void }) {
  const { t } = useTranslation('performance');
  return <Can permission={CorePermission.PerformanceCalibrate}><RowAction label={`${t('calibration.adjust')}: ${row.name}`} icon={SlidersHorizontal} disabled={!open || row.managerScore === null} onClick={() => onAdjust(row)} /></Can>;
}

/** The distribution, the waiting notice and the list of everyone with the adjustment of each person (the adjustment is open in the calibration stage only). */
export function CalibrationList({ data }: { data: ReturnType<typeof useCalibrationList> }) {
  const { t } = useTranslation('performance');
  const { list, table, page, query, columns, fields, exporting } = data;
  const [adjusting, setAdjusting] = useState<CalibrationRowDto | null>(null);
  const open = page?.cycle?.stage === 'cal';
  return (
    <>
      <Overview page={page} loading={query.isPending} />
      <DataTable<CalibrationRowDto>
        listKey="performance-calibration" {...table} caption={t('calibration.title')}
        toolbar={<ListToolbar listKey="performance-calibration" {...list.toolbar({ label: t('calibration.searchLabel'), placeholder: t('calibration.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.PerformanceCalibrationExport }} exporting={exporting} />} />}
        rowKey={(x) => x.employeeId} onRowClick={setAdjusting}
        actions={(x) => <AdjustAction row={x} open={open} onAdjust={setAdjusting} />}
        empty={<EmptyState icon={Scale} title={list.narrowed ? t('calibration.noMatches') : t('calibration.empty')} />} columns={columns}
      />
      {adjusting && <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} />}
    </>
  );
}
