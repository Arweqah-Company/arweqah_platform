import { TEMPLATE_AREAS, type TemplateDto, type TemplateKind } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import type { FilterField } from '@/shared/ui';
import { useTemplates } from './api';
import { KIND_KEYS } from './keys';

export const STATUSES = ['default', 'custom', 'pending'] as const;

/** The list of one kind with its search, its filters and the columns an export offers. */
export function useTemplateRows(kind: TemplateKind) {
  const { t, i18n } = useTranslation('templates');
  const catalog = useTemplates(kind);
  const list = useListPage(KIND_KEYS[kind].listKey);
  const { area, status } = list.filters.values;
  const name = (x: TemplateDto) => (i18n.language === 'ar' ? x.nameAr : x.nameEn);
  const fields: FilterField[] = [
    { id: 'area', label: t('columns.area'), type: 'select', options: TEMPLATE_AREAS.map((value) => ({ value, label: t(`areas.${value}`) })) },
    { id: 'status', label: t('columns.status'), type: 'select', options: STATUSES.map((value) => ({ value, label: t(`status.${value}`) })) },
  ];
  const fits = (x: TemplateDto) => matchesText([x.nameAr, x.nameEn, x.descriptionAr, x.descriptionEn, x.key], list.term) && (!area || x.area === area) && (!status || x.status === status);
  const exportColumns: ExportColumn<TemplateDto>[] = [
    { id: 'template', header: t('columns.template'), value: name },
    { id: 'area', header: t('columns.area'), value: (x) => t(`areas.${x.area}`) },
    { id: 'status', header: t('columns.status'), value: (x) => t(`status.${x.status}`) },
    { id: 'updated', header: t('columns.updated'), value: (x) => x.updatedAt ?? '' },
  ];
  return { catalog, list, fields, rows: catalog.data?.templates.filter(fits), exportColumns, name };
}
