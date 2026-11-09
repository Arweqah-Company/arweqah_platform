import { REMINDER_KINDS, type ReminderDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, type Column } from '@/shared/ui';
import type { FilterField } from '@/shared/ui/list-toolbar';
import { reminderTiming, titleOf } from './reminder-text';

/** The columns of the reminders list: kind, when it comes, the title in the screen's language and whether it is on. */
export function reminderColumns(t: TFunction<'performance'>, language: string): Column<ReminderDto>[] {
  return [
    { id: 'kind', header: t('reminders.columns.kind'), cell: (r) => <span className="font-medium">{t(`reminders.kinds.${r.kind}`)}</span> },
    { id: 'timing', header: t('reminders.columns.timing'), cell: (r) => reminderTiming(t, language, r) },
    { id: 'title', header: t('reminders.columns.title'), cell: (r) => titleOf(r, language) },
    { id: 'status', header: t('reminders.columns.status'), cell: (r) => <Badge tone={r.on ? 'success' : 'neutral'}>{t(r.on ? 'reminders.on' : 'reminders.off')}</Badge> },
  ];
}

/** What an export of the list holds: the kind, when, both languages of the title and the text, and the state. */
export function reminderExportColumns(t: TFunction<'performance'>, language: string): ExportColumn<ReminderDto>[] {
  return [
    { id: 'kind', header: t('reminders.columns.kind'), value: (r) => t(`reminders.kinds.${r.kind}`) },
    { id: 'timing', header: t('reminders.columns.timing'), value: (r) => reminderTiming(t, language, r) },
    { id: 'titleAr', header: t('reminders.fields.titleAr'), value: (r) => r.titleAr },
    { id: 'titleEn', header: t('reminders.fields.titleEn'), value: (r) => r.titleEn },
    { id: 'bodyAr', header: t('reminders.fields.bodyAr'), value: (r) => r.bodyAr },
    { id: 'bodyEn', header: t('reminders.fields.bodyEn'), value: (r) => r.bodyEn },
    { id: 'status', header: t('reminders.columns.status'), value: (r) => t(r.on ? 'reminders.on' : 'reminders.off') },
  ];
}

/** The filters of the list: the kind and whether it is on. */
export function reminderFilters(t: TFunction<'performance'>): FilterField[] {
  return [
    { id: 'kind', label: t('reminders.columns.kind'), type: 'select', options: REMINDER_KINDS.map((k) => ({ value: k, label: t(`reminders.kinds.${k}`) })) },
    { id: 'status', label: t('reminders.columns.status'), type: 'select', options: [{ value: 'on', label: t('reminders.on') }, { value: 'off', label: t('reminders.off') }] },
  ];
}
