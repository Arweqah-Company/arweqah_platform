import { TOUR_IDS, type TourStepSettingDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import type { FilterField } from '@/shared/ui';
import { useTourControls } from './tour-context';
import { useTourSteps } from './settings.api';

type Lang = 'ar' | 'en';

/** The list of steps with its search, its filters, and the wording each step really shows (the change, or the code's). */
export function useStepRows() {
  const { t, i18n } = useTranslation('tour');
  const { defaultText } = useTourControls();
  const steps = useTourSteps();
  const list = useListPage('tour-steps');
  const { tour, status, customised } = list.filters.values;
  const lang: Lang = i18n.language === 'ar' ? 'ar' : 'en';
  const title = (x: TourStepSettingDto, l: Lang = lang) => (l === 'ar' ? x.titleAr : x.titleEn) ?? defaultText(x.key, l)?.title ?? x.key;
  const body = (x: TourStepSettingDto, l: Lang = lang) => (l === 'ar' ? x.bodyAr : x.bodyEn) ?? defaultText(x.key, l)?.body ?? '';
  const yesNo = [{ value: 'yes', label: t('settings.yes') }, { value: 'no', label: t('settings.no') }];
  const fields: FilterField[] = [
    { id: 'tour', label: t('settings.columns.tour'), type: 'select', options: TOUR_IDS.map((value) => ({ value, label: t(`settings.tours.${value}`) })) },
    { id: 'status', label: t('settings.columns.status'), type: 'select', options: ['on', 'off'].map((value) => ({ value, label: t(`settings.status.${value}`) })) },
    { id: 'customised', label: t('settings.customised'), type: 'select', options: yesNo },
  ];
  const fits = (x: TourStepSettingDto) =>
    matchesText([title(x, 'ar'), title(x, 'en'), body(x, 'ar'), body(x, 'en'), x.key], list.term) &&
    (!tour || x.tour === tour) && (!status || (status === 'on') === x.enabled) && (!customised || (customised === 'yes') === x.customised);
  const exportColumns: ExportColumn<TourStepSettingDto>[] = [
    { id: 'order', header: t('settings.columns.order'), value: (x) => x.order },
    { id: 'title', header: t('settings.columns.title'), value: (x) => title(x) },
    { id: 'tour', header: t('settings.columns.tour'), value: (x) => t(`settings.tours.${x.tour}`) },
    { id: 'status', header: t('settings.columns.status'), value: (x) => t(`settings.status.${x.enabled ? 'on' : 'off'}`) },
    { id: 'updated', header: t('settings.columns.updated'), value: (x) => x.updatedAt ?? '' },
  ];
  return { steps, list, fields, rows: steps.data?.steps.filter(fits), exportColumns, title, body };
}
