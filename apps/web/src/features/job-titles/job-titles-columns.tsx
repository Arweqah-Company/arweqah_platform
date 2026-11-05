import type { JobTitleListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, type Column } from '@/shared/ui';

const titleName = (x: JobTitleListItemDto, ar: boolean): string => (ar ? x.nameAr : x.nameEn) || x.nameAr;

/** The columns of the list and of its export. The first column is the title's name and always stays. */
export function useTitleColumns(): { columns: Column<JobTitleListItemDto>[]; exportColumns: ExportColumn<JobTitleListItemDto>[] } {
  const { t, i18n } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const gradeOf = (x: JobTitleListItemDto) => (x.grade === null ? '' : `L${x.grade}`);
  const trackOf = (x: JobTitleListItemDto) => (x.track === null ? '' : t(`titles.tracks.${x.track}`));
  const columns: Column<JobTitleListItemDto>[] = [
    { id: 'name', header: t('columns.name'), cell: (x) => <span className="font-medium">{titleName(x, ar)}</span> },
    { id: 'code', header: t('columns.code'), cell: (x) => (x.code ? <bdi dir="ltr" className="font-latin tracking-wide">{x.code}</bdi> : <Badge tone="warning">{t('columns.noCode')}</Badge>) },
    { id: 'unit', header: t('columns.unit'), cell: (x) => (ar ? x.unitNameAr : x.unitNameEn) || x.unitNameAr },
    { id: 'grade', header: t('titles.grade'), cell: (x) => (x.grade === null ? '—' : <span dir="ltr">{gradeOf(x)}</span>) },
    { id: 'track', header: t('titles.track'), cell: (x) => trackOf(x) || '—' },
    { id: 'occupants', header: t('columns.occupants'), cell: (x) => <span className="inline-flex items-center gap-2"><span dir="ltr">{x.occupants}</span>{x.occupants === 0 && <Badge tone="warning">{t('titles.vacant')}</Badge>}</span> },
  ];
  const exportColumns: ExportColumn<JobTitleListItemDto>[] = [
    { id: 'code', header: t('columns.code'), value: (x) => x.code },
    { id: 'nameAr', header: t('titles.nameAr'), value: (x) => x.nameAr },
    { id: 'nameEn', header: t('titles.nameEn'), value: (x) => x.nameEn },
    { id: 'unitCode', header: t('columns.unitCode'), value: (x) => x.unitCode },
    { id: 'unit', header: t('columns.unitPath'), value: (x) => (ar ? x.unitPathAr : x.unitPathEn) },
    { id: 'grade', header: t('titles.grade'), value: gradeOf },
    { id: 'track', header: t('titles.track'), value: trackOf },
    { id: 'occupants', header: t('columns.occupants'), value: (x) => x.occupants },
    { id: 'status', header: t('columns.status'), value: (x) => tc(x.isActive ? 'status.active' : 'status.inactive') },
  ];
  return { columns, exportColumns };
}
