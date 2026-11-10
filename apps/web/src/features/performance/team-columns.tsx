import type { TeamEvaluationRowDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, type Column } from '@/shared/ui';

const MINE_TONE = { none: 'warning', draft: 'info', sent: 'success' } as const;

/** The columns of the team list and of its export: the person, the title, the direct manager («you» or the name with a mark), the two evaluations, the score and its level. */
export function useTeamColumns(): { columns: Column<TeamEvaluationRowDto>[]; exportColumns: ExportColumn<TeamEvaluationRowDto>[] } {
  const { t, i18n } = useTranslation('performance');
  const title = (x: TeamEvaluationRowDto) => (i18n.language === 'ar' ? x.titleNameAr : x.titleNameEn) || x.titleNameAr || '';
  const manager = (x: TeamEvaluationRowDto) => (x.isDirect ? t('team.you') : x.directManagerName ?? '—');
  const selfText = (x: TeamEvaluationRowDto) => t(x.selfSent ? 'team.selfDone' : 'team.selfWaiting');
  const columns: Column<TeamEvaluationRowDto>[] = [
    { id: 'employee', header: t('team.columns.employee'), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: 'title', header: t('team.columns.title'), cell: title },
    { id: 'manager', header: t('team.columns.manager'), cell: (x) => <span className="flex flex-wrap items-center gap-1">{manager(x)}{!x.isDirect && <Badge tone="neutral">{t('team.indirect')}</Badge>}</span> },
    { id: 'self', header: t('team.columns.self'), cell: (x) => <Badge tone={x.selfSent ? 'success' : 'neutral'}>{selfText(x)}</Badge> },
    { id: 'mine', header: t('team.columns.mine'), cell: (x) => <Badge tone={MINE_TONE[x.mine]}>{t(`team.mine.${x.mine}`)}</Badge> },
    { id: 'score', header: t('team.columns.score'), cell: (x) => (x.score === null ? '—' : <span dir="ltr">{x.score}</span>) },
    { id: 'level', header: t('team.columns.level'), cell: (x) => x.levelName ?? '—' },
  ];
  const exportColumns: ExportColumn<TeamEvaluationRowDto>[] = [
    { id: 'employee', header: t('team.columns.employee'), value: (x) => x.name }, { id: 'title', header: t('team.columns.title'), value: title },
    { id: 'manager', header: t('team.columns.manager'), value: manager }, { id: 'self', header: t('team.columns.self'), value: selfText },
    { id: 'mine', header: t('team.columns.mine'), value: (x) => t(`team.mine.${x.mine}`) }, { id: 'score', header: t('team.columns.score'), value: (x) => x.score ?? '' },
    { id: 'level', header: t('team.columns.level'), value: (x) => x.levelName ?? '' },
  ];
  return { columns, exportColumns };
}
