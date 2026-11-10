import type { CalibrationRowDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, type Column } from '@/shared/ui';

/** The number as the table shows it: left-to-right digits, a dash when there is none; the adjustment carries its sign. */
export const num = (v: number | null) => (v === null ? '—' : <span dir="ltr">{v}</span>);
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

/** The columns of the calibration list and of its export: the person, the title, the manager, the manager's score, the adjustment, the calibrated score and its level. */
export function useCalibrationColumns(): { columns: Column<CalibrationRowDto>[]; exportColumns: ExportColumn<CalibrationRowDto>[] } {
  const { t, i18n } = useTranslation('performance');
  const title = (x: CalibrationRowDto) => (i18n.language === 'ar' ? x.titleNameAr : x.titleNameEn) || x.titleNameAr || '';
  const columns: Column<CalibrationRowDto>[] = [
    { id: 'employee', header: t('calibration.columns.employee'), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: 'title', header: t('calibration.columns.title'), cell: title },
    { id: 'manager', header: t('calibration.columns.manager'), cell: (x) => x.managerName ?? '—' },
    { id: 'managerScore', header: t('calibration.columns.managerScore'), cell: (x) => (x.managerScore === null ? <Badge tone="warning">{t('calibration.waiting')}</Badge> : num(x.managerScore)) },
    { id: 'adjustment', header: t('calibration.columns.adjustment'), cell: (x) => (x.adjustment ? <span dir="ltr" className="font-medium">{signed(x.adjustment)}</span> : '—') },
    { id: 'calibrated', header: t('calibration.columns.calibrated'), cell: (x) => num(x.calibrated) },
    { id: 'level', header: t('calibration.columns.level'), cell: (x) => x.levelName ?? '—' },
  ];
  const exportColumns: ExportColumn<CalibrationRowDto>[] = [
    { id: 'employee', header: t('calibration.columns.employee'), value: (x) => x.name }, { id: 'title', header: t('calibration.columns.title'), value: title },
    { id: 'manager', header: t('calibration.columns.manager'), value: (x) => x.managerName ?? '' }, { id: 'managerScore', header: t('calibration.columns.managerScore'), value: (x) => x.managerScore ?? '' },
    { id: 'adjustment', header: t('calibration.columns.adjustment'), value: (x) => x.adjustment }, { id: 'calibrated', header: t('calibration.columns.calibrated'), value: (x) => x.calibrated ?? '' },
    { id: 'level', header: t('calibration.columns.level'), value: (x) => x.levelName ?? '' },
  ];
  return { columns, exportColumns };
}
