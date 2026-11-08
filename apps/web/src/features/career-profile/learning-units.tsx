import { CorePermission, LEARNING_PRIORITIES, type CareerContent } from '@arweqah-platform/shared';
import { ExternalLink, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { Badge, DataTable, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import { formatMinutes } from './format-minutes';
import { filterUnits, learningExportColumns, learningFilterFields, type LearningRow } from './learning-list';

const PRIORITY_TONE: Record<LearningRow['priority'], 'danger' | 'warning' | 'info'> = { [LEARNING_PRIORITIES[0]]: 'danger', [LEARNING_PRIORITIES[1]]: 'warning', [LEARNING_PRIORITIES[2]]: 'info' };

function openLink(link: string): void {
  window.open(link, '_blank', 'noopener,noreferrer');
}

/** The units of one period as a list: search by name or provider, filters (priority, language), table or cards, export; the link opens in a new tab. */
export function LearningUnits({ period, preview }: { period: CareerContent['learning']['periods'][number] | undefined; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-learning');
  const all: LearningRow[] = (period?.units ?? []).map((u) => ({ ...u, period: period?.name ?? '' }));
  const rows = filterUnits(all, list.term, list.filters.values);
  const total = all.reduce((sum, u) => sum + u.minutes, 0);
  const columns: Column<LearningRow>[] = [
    { id: 'priority', header: t('learning.columns.priority'), cell: (u) => <Badge tone={PRIORITY_TONE[u.priority]}>{u.priority}</Badge> },
    { id: 'unit', header: t('learning.columns.unit'), cell: (u) => <span><b className="font-medium">{u.title}</b>{u.provider && <span className="block text-sm text-muted">{u.provider}</span>}</span> },
    { id: 'duration', header: t('learning.columns.duration'), cell: (u) => u.duration },
    { id: 'language', header: t('learning.columns.language'), cell: (u) => u.language },
    { id: 'link', header: t('learning.columns.link'), cell: (u) => (u.link ? <a className="font-medium text-link underline" href={u.link} target="_blank" rel="noopener noreferrer">{t('learning.openLink')}</a> : <span className="text-muted">{t('learning.noLink')}</span>) },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t('learning.periodTotal', { count: all.length, duration: formatMinutes(total, t) })}</p>
      <DataTable<LearningRow>
        listKey="career-learning"
        caption={t('learning.units')}
        view={list.view}
        rows={rows}
        rowKey={(u) => u.id ?? u.title}
        toolbar={<ListToolbar listKey="career-learning" {...list.toolbar({ label: t('learning.searchLabel'), placeholder: t('learning.searchPlaceholder') }, learningFilterFields(t, all))} actions={preview ? undefined : <ExchangeButtons permissions={{ export: CorePermission.CareerLearningExport }} exporting={{ columns: learningExportColumns(t), filename: 'career-learning', pageRows: rows, total: rows.length, loadAll: async () => rows }} />} />}
        actions={(u) => (u.link ? <Can permission={CorePermission.CareerProfileView}><RowAction label={`${t('learning.openLink')}: ${u.title}`} icon={ExternalLink} onClick={() => openLink(u.link)} /></Can> : null)}
        empty={<EmptyState icon={GraduationCap} title={t('learning.noMatches')} />}
        columns={columns}
      />
    </div>
  );
}
