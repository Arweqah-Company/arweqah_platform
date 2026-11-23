import type { NoticeListItemDto } from '@arweqah-platform/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog } from '@/shared/ui';
import { useDeleteNotice, useNoticeAction, useUnpinNotice } from '../api';
import { useNoticeWords } from '../shared/notice-ui';
import { NoticeDetailsDialog } from './details-dialog';
import { NoticeFormDialog, type FormMode } from './notice-form-dialog';
import { RejectDialog } from './reject-dialog';

export type NoticeCommand = 'view' | 'edit' | 'new' | 'submit' | 'delete' | 'pin' | 'unpin' | 'archive' | 'revise' | 'revise-cancel' | 'approve' | 'reject';

/** A command that opens a window to ask first; the others run at once. */
type Pending = { command: 'delete' | 'archive' | 'revise' | 'revise-cancel' | 'approve'; notice: NoticeListItemDto };
type Form = { mode: FormMode; id: string | null };

/**
 * Every command on a notice (the row icons, the details window, the approvals list) in one place: what asks first (delete, archive, new version,
 * cancel the new version, approve) shows its `ConfirmDialog`; reject, write and view open their windows; the rest run and say so in a toast.
 */
export function useNoticeCommands(): { run: (command: NoticeCommand, notice?: NoticeListItemDto) => void; dialogs: ReactNode } {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const words = useNoticeWords();
  const [pending, setPending] = useState<Pending | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<NoticeListItemDto | null>(null);
  const action = useNoticeAction();
  const remove = useDeleteNotice();
  const unpin = useUnpinNotice();
  const fail = (error: unknown) => toast.error(errorMessage(tc, error));
  const quick = async (notice: NoticeListItemDto, name: 'submit' | 'pin', done: string) => {
    try {
      await action.mutateAsync({ id: notice.id, action: name });
      toast.success(done);
    } catch (error) {
      fail(error);
    }
  };
  const confirm = async () => {
    if (!pending) return;
    const { command, notice } = pending;
    try {
      if (command === 'delete') await remove.mutateAsync(notice.id);
      else await action.mutateAsync({ id: notice.id, action: command });
      toast.success(t(`confirm.${command}.done`));
      setPending(null);
      if (command === 'revise') setForm({ mode: 'revise', id: notice.id });
    } catch (error) {
      setPending(null);
      fail(error);
    }
  };
  const run = (command: NoticeCommand, notice?: NoticeListItemDto) => {
    if (command === 'new') return setForm({ mode: 'new', id: null });
    if (!notice) return;
    const direct: Partial<Record<NoticeCommand, () => void>> = {
      view: () => setViewing(notice.id),
      edit: () => setForm({ mode: notice.status === 'revising' || notice.hiddenForRevision ? 'revise' : 'edit', id: notice.id }),
      reject: () => setRejecting(notice),
      submit: () => void quick(notice, 'submit', t('done.submit')),
      pin: () => void quick(notice, 'pin', t('done.pin')),
      unpin: () => void unpin.mutateAsync(notice.id).then(() => toast.success(t('done.unpin')), fail),
    };
    const open = direct[command];
    if (open) return open();
    setPending({ command: command as Pending['command'], notice });
  };
  const dialogs = (
    <>
      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={t(`confirm.${pending.command}.title`)}
          description={t(`confirm.${pending.command}.body`, { title: words.title(pending.notice), date: words.day(pending.notice.publishOn), count: pending.notice.audience.recipients ?? 0 })}
          confirmLabel={t(`confirm.${pending.command}.button`)}
          tone={pending.command === 'delete' || pending.command === 'archive' ? 'danger' : 'primary'}
          busy={action.isPending || remove.isPending}
          onConfirm={() => void confirm()}
        />
      )}
      {form && <NoticeFormDialog mode={form.mode} id={form.id} onClose={() => setForm(null)} />}
      <NoticeDetailsDialog id={viewing} onClose={() => setViewing(null)} run={run} />
      <RejectDialog notice={rejecting} onClose={() => setRejecting(null)} />
    </>
  );
  return { run, dialogs };
}
