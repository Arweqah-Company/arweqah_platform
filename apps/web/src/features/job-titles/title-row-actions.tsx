import { CorePermission, type JobTitleListItemDto } from '@arweqah-platform/shared';
import { IdCard, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { RowAction } from '@/shared/ui';
import type { TitleDialogState } from './title-dialogs';

/** Every action on a title's row, as icons: open the card, edit its content, edit it, delete it; each with its own key. `first` marks the row the welcome tour points at. */
export function TitleRowActions({ title, first, onOpen }: { title: JobTitleListItemDto; first: boolean; onOpen: (state: TitleDialogState) => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const name = (i18n.language === 'ar' ? title.nameAr : title.nameEn) || title.nameAr;
  const label = (text: string) => `${text}: ${name}`;
  const open = (kind: 'card' | 'content' | 'edit' | 'delete') => () => onOpen({ kind, title });
  return (
    <>
      <span data-tour={first ? 'title-card' : undefined} className="inline-flex"><RowAction label={label(t('actions.openCard'))} icon={IdCard} onClick={open('card')} /></span>
      <Can adminMode permission={CorePermission.OrgTitlesEditContent}><RowAction label={label(t('actions.editContent'))} icon={ListChecks} onClick={open('content')} /></Can>
      <Can adminMode permission={CorePermission.JobTitlesUpdate}><RowAction label={label(tc('actions.edit'))} icon={Pencil} onClick={open('edit')} /></Can>
      <Can adminMode permission={CorePermission.JobTitlesDelete}><RowAction label={label(tc('actions.delete'))} icon={Trash2} danger onClick={open('delete')} /></Can>
    </>
  );
}
