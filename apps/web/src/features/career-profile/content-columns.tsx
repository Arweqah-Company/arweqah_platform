import type { CareerListStatus, CareerTitleListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge } from '@/shared/ui';

const STATUS_TONE: Record<CareerListStatus, 'neutral' | 'warning' | 'success'> = { none: 'neutral', draft: 'warning', ready: 'success' };

/** The state of a title's path as a badge (never colour alone: the word is in it). */
export function StatusBadge({ status }: { status: CareerListStatus }) {
  const { t } = useTranslation('career-profile');
  return <Badge tone={STATUS_TONE[status]}>{t(`content.status.${status}`)}</Badge>;
}

/** The columns of the list's export. */
export function useContentColumns(): { exportColumns: ExportColumn<CareerTitleListItemDto>[] } {
  const { t, i18n } = useTranslation('career-profile');
  const ar = i18n.language === 'ar';
  const grade = (x: CareerTitleListItemDto) => (x.grade === null ? '' : `L${x.grade}`);
  const unit = (x: CareerTitleListItemDto) => (ar ? x.unitNameAr : x.unitNameEn) || x.unitNameAr;
  const exportColumns: ExportColumn<CareerTitleListItemDto>[] = [
    { id: 'code', header: t('content.columns.code'), value: (x) => x.code },
    { id: 'nameAr', header: t('content.export.nameAr'), value: (x) => x.nameAr },
    { id: 'nameEn', header: t('content.export.nameEn'), value: (x) => x.nameEn },
    { id: 'unit', header: t('content.columns.unit'), value: unit },
    { id: 'grade', header: t('content.columns.grade'), value: grade },
    { id: 'track', header: t('content.columns.track'), value: (x) => (x.track ? t(`content.tracks.${x.track}`) : '') },
    { id: 'status', header: t('content.columns.status'), value: (x) => t(`content.status.${x.status}`) },
    { id: 'version', header: t('content.columns.version'), value: (x) => x.version },
    { id: 'holders', header: t('content.columns.holders'), value: (x) => x.holders },
  ];
  return { exportColumns };
}
