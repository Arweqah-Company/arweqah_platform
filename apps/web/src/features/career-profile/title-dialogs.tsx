import type { CareerTitleListItemDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, ConfirmDialog, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useReopenAck, useSetDraft, useSetReady, useTitleContent } from './api';
import { FreeReading } from './free-reading';
import { TitleFileDialog } from './title-file-dialog';

export type TitleDialogState = { kind: 'preview' | 'file' | 'ready' | 'draft' | 'reopen'; title: CareerTitleListItemDto } | null;

const nameOf = (x: CareerTitleListItemDto, ar: boolean): string => (ar ? x.nameAr : x.nameEn) || x.nameAr;

/** What the holders of the title see, as they see it (no names, no progress); a title with no content says so. */
function PreviewDialog({ title, onClose }: { title: CareerTitleListItemDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('career-profile');
  const content = useTitleContent(title.id);
  const stored = content.data && content.data.version > 0 ? content.data : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('preview.title', { name: nameOf(title, i18n.language === 'ar') })} description={stored?.status === 'ready' ? t('preview.ready') : t('preview.draft')} xl>
      {content.isError && <Alert tone="danger">{t('preview.failed')}</Alert>}
      {content.data && !stored && <Alert tone="info">{t('preview.empty')}</Alert>}
      {stored && <FreeReading content={stored.content} preview />}
      <DialogFooter><Button variant="secondary" onClick={onClose}>{t('file.close')}</Button></DialogFooter>
    </Dialog>
  );
}

/** Asks HR to confirm showing the path to the holders (they will be asked to acknowledge it) or taking it back to a draft. */
function StatusDialog({ kind, title, onClose }: { kind: 'ready' | 'draft'; title: CareerTitleListItemDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('career-profile');
  const ready = useSetReady(title.id);
  const draft = useSetDraft(title.id);
  const action = kind === 'ready' ? ready : draft;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t(`${kind}.title`, { name: nameOf(title, i18n.language === 'ar') })}
      description={t(`${kind}.description`, { count: title.holders })}
      confirmLabel={t(`${kind}.confirm`)}
      busy={action.isPending}
      onConfirm={() => action.mutate(undefined as never, { onSuccess: () => { toast.success(t(`${kind}.done`)); onClose(); } })}
    >
      {action.isError && <Alert tone="danger">{t(`${kind}.failed`)}</Alert>}
    </ConfirmDialog>
  );
}

/** Asks the holders to acknowledge the path again; the reason is required and is kept in the log. */
function ReopenDialog({ title, onClose }: { title: CareerTitleListItemDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const [reason, setReason] = useState('');
  const reopen = useReopenAck(title.id);
  const short = reason.trim().length < 5;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('reopen.title')} description={t('reopen.description', { count: title.holders })}>
      <FormField label={t('reopen.reason')} error={reason && short ? t('reopen.reasonShort') : undefined}>
        {(props) => <Input {...props} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />}
      </FormField>
      {reopen.isError && <Alert tone="danger">{t('reopen.failed')}</Alert>}
      <DialogFooter>
        <Button disabled={short || reopen.isPending} onClick={() => reopen.mutate({ reason: reason.trim() }, { onSuccess: (r) => { toast.success(t('reopen.done', { count: r.affected })); onClose(); } })}>{t('reopen.confirm')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

/** The dialog the row's icon opened. */
export function TitleDialogs({ state, onClose }: { state: TitleDialogState; onClose: () => void }) {
  const { i18n } = useTranslation();
  if (!state) return null;
  const { kind, title } = state;
  if (kind === 'preview') return <PreviewDialog title={title} onClose={onClose} />;
  if (kind === 'file') return <TitleFileDialog titleId={title.id} titleName={nameOf(title, i18n.language === 'ar')} titleCode={title.code} onClose={onClose} />;
  if (kind === 'reopen') return <ReopenDialog title={title} onClose={onClose} />;
  return <StatusDialog kind={kind} title={title} onClose={onClose} />;
}
