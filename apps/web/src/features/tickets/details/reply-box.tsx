import { MAX_TICKET_FILES, MAX_TICKET_TEXT, type FileDto } from '@arweqah-platform/shared';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FileAttachments, FormField, Textarea } from '@/shared/ui';
import { useTicketReply } from '../api';

/** Answer on a ticket, with files; Ctrl+Enter sends. */
export function ReplyBox({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const reply = useTicketReply(ticketId);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<FileDto[]>([]);
  const send = async () => {
    if (!body.trim() || reply.isPending) return;
    try {
      await reply.mutateAsync({ body, fileIds: files.map((f) => f.id) });
      setBody('');
      setFiles([]);
      toast.success(t('reply.sent'));
    } catch {
      /* shown below */
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void send();
  };
  return (
    <form className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); void send(); }} onKeyDown={onKeyDown} noValidate>
      {reply.isError && <Alert>{errorMessage(tc, reply.error)}</Alert>}
      <FormField label={t('reply.label')}>{(p) => <Textarea {...p} rows={3} maxLength={MAX_TICKET_TEXT} value={body} onChange={(e) => setBody(e.target.value)} />}</FormField>
      <FileAttachments compact files={files} onChange={setFiles} max={MAX_TICKET_FILES} label={t('details.attachments')} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{t('details.shortcut')}</span>
        <Button type="submit" disabled={reply.isPending || !body.trim()}>{t('reply.send')}</Button>
      </div>
    </form>
  );
}
