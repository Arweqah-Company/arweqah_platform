import { CorePermission, type NoticeListItemDto } from '@arweqah-platform/shared';
import { Ban, Eye, FilePen, Pencil, Pin, PinOff, Send, Trash2, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { RowAction } from '@/shared/ui';
import type { NoticeCommand } from './notice-commands';

/** The icons of a notice row: each one only for who holds its key and only when the notice is in a state that allows it (`abilities` from the API). */
export function NoticeRowActions({ notice, run }: { notice: NoticeListItemDto; run: (command: NoticeCommand, notice: NoticeListItemDto) => void }) {
  const { t } = useTranslation('notices');
  const a = notice.abilities;
  const go = (command: NoticeCommand) => () => run(command, notice);
  return (
    <>
      <Can permission={CorePermission.NoticesManageView}><RowAction label={t('actions.view')} icon={Eye} onClick={go('view')} /></Can>
      {a.edit && <Can permission={CorePermission.NoticesEdit}><RowAction label={t('actions.edit')} icon={Pencil} onClick={go('edit')} /></Can>}
      {a.submit && <Can permission={CorePermission.NoticesSubmit}><RowAction label={t('actions.submit')} icon={Send} onClick={go('submit')} /></Can>}
      {a.delete && <Can permission={CorePermission.NoticesDelete}><RowAction danger label={t('actions.delete')} icon={Trash2} onClick={go('delete')} /></Can>}
      {a.pin && <Can permission={CorePermission.NoticesPin}><RowAction label={t('actions.pin')} icon={Pin} onClick={go('pin')} /></Can>}
      {a.unpin && <Can permission={CorePermission.NoticesPin}><RowAction label={t('actions.unpin')} icon={PinOff} onClick={go('unpin')} /></Can>}
      {a.revise && <Can permission={CorePermission.NoticesRevise}><RowAction label={t('actions.revise')} icon={FilePen} onClick={go('revise')} /></Can>}
      {a.reviseCancel && <Can permission={CorePermission.NoticesReviseCancel}><RowAction label={t('actions.reviseCancel')} icon={Undo2} onClick={go('revise-cancel')} /></Can>}
      {a.archive && <Can permission={CorePermission.NoticesArchive}><RowAction danger label={t('actions.archive')} icon={Ban} onClick={go('archive')} /></Can>}
    </>
  );
}
