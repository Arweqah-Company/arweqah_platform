import { CorePermission, type CareerTitleListItemDto } from '@arweqah-platform/shared';
import { CheckCheck, Eye, FileUp, Lock, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Button, RowAction } from '@/shared/ui';
import type { TitleDialogState } from './title-dialogs';

/**
 * What can be done to the title open in the panel, each with its own key: preview as the employee sees it (icon), upload the title file, set ready
 * or back to a draft (the ready one only when nothing is missing), and ask the holders to acknowledge again.
 */
export function TitleActions({ title, canBeReady, onOpen }: { title: CareerTitleListItemDto; canBeReady: boolean; onOpen: (state: TitleDialogState) => void }) {
  const { t } = useTranslation('career-profile');
  const open = (kind: NonNullable<TitleDialogState>['kind']) => () => onOpen({ kind, title });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={CorePermission.CareerTitlefilePreview}><RowAction label={t('actions.preview')} icon={Eye} onClick={open('preview')} /></Can>
      <Can permission={CorePermission.CareerTitlefileUpload}>
        <Button data-tour="career-upload" onClick={open('file')}><FileUp className="size-4" aria-hidden />{t('actions.upload')}</Button>
      </Can>
      <Can permission={CorePermission.CareerTitlefilePublish}>
        {title.status === 'ready' ? (
          <Button variant="secondary" onClick={open('draft')}><Undo2 className="size-4" aria-hidden />{t('actions.draft')}</Button>
        ) : (
          title.status === 'draft' && <Button variant="secondary" disabled={!canBeReady} onClick={open('ready')}><CheckCheck className="size-4" aria-hidden />{t('actions.ready')}</Button>
        )}
      </Can>
      <Can permission={CorePermission.CareerAcknowledgeReopen}>
        {title.status === 'ready' && <Button variant="secondary" onClick={open('reopen')}><Lock className="size-4" aria-hidden />{t('actions.reopen', { count: title.holders })}</Button>}
      </Can>
    </div>
  );
}
