import type { TaskCommentDto, TaskConversationDto } from '@arweqah-platform/shared';
import { MessageSquareReply, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog, RowAction } from '@/shared/ui';
import { CommentBody } from './comment-body';
import { CommentComposer } from './comment-composer';
import { commentFileUrl, useDeleteComment } from './comments.api';

interface Props {
  taskId: string;
  conversation: TaskConversationDto;
  comment: TaskCommentDto;
  /** The comment being answered (the box opens under it), and the one being edited. */
  replying: boolean;
  onReply: () => void;
  onDone: () => void;
}

function Files({ taskId, comment }: { taskId: string; comment: TaskCommentDto }) {
  if (comment.files.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {comment.files.map((f) => (
        <li key={f.id}>
          <a href={commentFileUrl(taskId, comment.id, f.id)} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1 text-xs text-link hover:underline">
            <Paperclip className="size-3.5" aria-hidden />
            <span dir="ltr">{f.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Actions({ comment, conversation, onReply, onEdit, onDelete }: { comment: TaskCommentDto; conversation: TaskConversationDto; onReply: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation('tasks');
  return (
    <div className="flex">
      {conversation.can.reply && !comment.isDeleted && <RowAction label={t('comments.reply')} icon={MessageSquareReply} onClick={onReply} />}
      {comment.mayEdit && <RowAction label={t('comments.edit')} icon={Pencil} onClick={onEdit} />}
      {comment.mayDelete && <RowAction label={t('comments.delete')} icon={Trash2} onClick={onDelete} danger />}
    </div>
  );
}

/** One comment: who, when, the text with its mentions, its files, and what this person may do with it. */
export function CommentItem({ taskId, conversation, comment, replying, onReply, onDone }: Props) {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteComment(taskId);
  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(comment.id);
      setConfirming(false);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <li id={`comment-${comment.id}`} className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-petrol-800 text-xs font-bold text-cream">{comment.author.name.trim().charAt(0)}</span>
          <span className="font-medium text-fg">{comment.author.name}</span>
          {comment.replyTo && <span>{t('comments.inReplyTo', { name: comment.replyTo.name })}</span>}
          {comment.isEdited && <span>· {t('comments.edited')}</span>}
        </span>
        <span className="flex items-center gap-1">
          <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString(i18n.language)}</time>
          <Actions comment={comment} conversation={conversation} onReply={onReply} onEdit={() => setEditing(true)} onDelete={() => setConfirming(true)} />
        </span>
      </div>
      <div className="mt-2">
        {comment.isDeleted && <p className="text-sm italic text-muted">{t('comments.deleted')}</p>}
        {!comment.isDeleted && editing && <CommentComposer taskId={taskId} conversation={conversation} target={{ type: 'edit', comment }} onDone={() => { setEditing(false); onDone(); }} />}
        {!comment.isDeleted && !editing && <CommentBody body={comment.body} people={comment.mentions} />}
        <Files taskId={taskId} comment={comment} />
      </div>
      {replying && <div className="mt-3 border-t border-neutral-200 pt-3"><CommentComposer taskId={taskId} conversation={conversation} target={{ type: 'reply', comment }} onDone={onDone} /></div>}
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} tone="danger" title={t('comments.deleteTitle')} description={t('comments.deleteText')} confirmLabel={t('comments.delete')} busy={remove.isPending} onConfirm={() => void confirmDelete()} />
    </li>
  );
}
