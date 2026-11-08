import { CorePermission, type CareerTitleListItemDto } from '@arweqah-platform/shared';
import { CheckCheck, Eye, FileUp, RotateCcw, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { RowAction } from '@/shared/ui';
import type { TitleDialogState } from './title-dialogs';

/** Every action on a title's row, as icons, each with its own key: preview, upload the title file, set ready or back to draft, reopen the acknowledgement. */
export function TitleRowActions({ title, first, onOpen }: { title: CareerTitleListItemDto; first: boolean; onOpen: (state: TitleDialogState) => void }) {
  const { t, i18n } = useTranslation('career-profile');
  const name = (i18n.language === 'ar' ? title.nameAr : title.nameEn) || title.nameAr;
  const label = (text: string) => `${text}: ${name}`;
  const open = (kind: NonNullable<TitleDialogState>['kind']) => () => onOpen({ kind, title });
  return (
    <>
      <Can permission={CorePermission.CareerTitlefilePreview}><RowAction label={label(t('actions.preview'))} icon={Eye} onClick={open('preview')} /></Can>
      <Can permission={CorePermission.CareerTitlefileUpload}>
        <span data-tour={first ? 'career-upload' : undefined} className="inline-flex"><RowAction label={label(t('actions.upload'))} icon={FileUp} onClick={open('file')} /></span>
      </Can>
      <Can permission={CorePermission.CareerTitlefilePublish}>
        {title.status === 'ready' ? <RowAction label={label(t('actions.draft'))} icon={Undo2} onClick={open('draft')} /> : title.status === 'draft' && <RowAction label={label(t('actions.ready'))} icon={CheckCheck} onClick={open('ready')} />}
      </Can>
      <Can permission={CorePermission.CareerAcknowledgeReopen}>{title.status === 'ready' && <RowAction label={label(t('actions.reopen'))} icon={RotateCcw} onClick={open('reopen')} />}</Can>
    </>
  );
}
