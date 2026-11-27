import { CorePermission, type ReactionKey, type TaskCommentDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ReactionBar } from '@/shared/ui';
import { useReactToComment, useUnreactToComment } from './comments.api';

/** The reactions under a comment: the chips and the picker; a refusal shows as a message. */
export function CommentReactions({ taskId, comment }: { taskId: string; comment: TaskCommentDto }) {
  const { t: tc } = useTranslation();
  const react = useReactToComment(taskId);
  const unreact = useUnreactToComment(taskId);
  const fail = (error: unknown) => toast.error(errorMessage(tc, error));
  return (
    <div className="mt-2">
      <ReactionBar reactions={comment.reactions} permission={CorePermission.TasksCommentReact} onReact={(reaction: ReactionKey) => react.mutate({ id: comment.id, reaction }, { onError: fail })} onRemove={() => unreact.mutate(comment.id, { onError: fail })} />
    </div>
  );
}
