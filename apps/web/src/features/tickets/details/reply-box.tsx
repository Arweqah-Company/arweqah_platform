import { CorePermission, MAX_TICKET_FILES, MAX_TICKET_TEXT, type FileDto, type TicketEventDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { encodeMentions, type Mentioned } from '@/shared/lib/mention-text';
import { Alert, Button, FileAttachments, MentionTextarea } from '@/shared/ui';
import { useTicketMentionables, useTicketReply } from '../api';

interface Props {
  ticketId: string;
  /** The reply being answered: the box then sits under it and names whom it answers. */
  answering?: TicketEventDto;
  /** The ticket waits for the sender's confirmation: the box offers «send and confirm the closing» (a plain reply returns it to «open»). */
  confirming?: boolean;
  onDone?: () => void;
}

/** The state and the sending of the box: the text with the people picked from the @ list, and the files. */
function useReply({ ticketId, answering, onDone }: Props) {
  const { t } = useTranslation('tickets');
  const reply = useTicketReply(ticketId);
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<Mentioned[]>([]);
  const [files, setFiles] = useState<FileDto[]>([]);
  const send = async (confirmClose = false) => {
    if (!body.trim() || reply.isPending) return;
    try {
      await reply.mutateAsync({ body: encodeMentions(body, picked), fileIds: files.map((f) => f.id), parentEventId: answering?.id, ...(confirmClose ? { confirmClose: true } : {}) });
      setBody('');
      setPicked([]);
      setFiles([]);
      toast.success(t('reply.sent'));
      onDone?.();
    } catch {
      /* shown above the box */
    }
  };
  const pick = (person: Mentioned) => setPicked((all) => (all.some((p) => p.id === person.id) ? all : [...all, person]));
  return { reply, body, setBody, files, setFiles, send, pick };
}

type Sending = ReturnType<typeof useReply>;

/** The buttons under the box: cancel (on an answer), «send and confirm the closing» when the ticket waits for it, and the plain send. */
function ReplyButtons({ r, offersConfirm, answering, onDone }: { r: Sending; offersConfirm: boolean; answering: boolean; onDone?: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const blocked = r.reply.isPending || !r.body.trim();
  return (
    <div className="flex gap-2">
      {answering && <Button type="button" variant="ghost" onClick={onDone}>{tc('actions.cancel')}</Button>}
      {offersConfirm && <Button type="button" disabled={blocked} onClick={() => void r.send(true)}>{t('reply.sendAndConfirm')}</Button>}
      <Button type="submit" variant={offersConfirm ? 'secondary' : 'primary'} disabled={blocked}>{t('reply.send')}</Button>
    </div>
  );
}

/** Answer on a ticket, or on one of its replies, with files; `@` offers people to mention and Ctrl+Enter sends. */
export function ReplyBox(props: Props) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const mayMention = can(CorePermission.TicketsCommentMention);
  const offersConfirm = !!props.confirming && !props.answering && can(CorePermission.TicketsConfirmClose);
  const r = useReply(props);
  const label = props.answering ? t('reply.answerTo', { name: props.answering.actor?.name ?? '' }) : t('reply.label');
  return (
    <form className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); void r.send(); }} noValidate>
      {r.reply.isError && <Alert>{errorMessage(tc, r.reply.error)}</Alert>}
      <span className="text-sm font-medium">{label}</span>
      <MentionTextarea usePeople={useTicketMentionables} scopeId={props.ticketId} listLabel={t('reply.mentionList')} label={label} mayMention={mayMention} maxLength={MAX_TICKET_TEXT} value={r.body} onChange={r.setBody} onPick={r.pick} onSubmit={() => void r.send()} />
      <FileAttachments compact files={r.files} onChange={r.setFiles} max={MAX_TICKET_FILES} label={t('details.attachments')} />
      {offersConfirm && <p className="text-xs text-muted">{t('reply.confirmNote')}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted">{mayMention ? t('reply.hint') : t('details.shortcut')}</span>
        <ReplyButtons r={r} offersConfirm={offersConfirm} answering={!!props.answering} onDone={props.onDone} />
      </div>
    </form>
  );
}
