import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';

export class TaskCommentNotFoundError extends NotFoundError {
  constructor() {
    super('Comment');
  }
}

/** The person belongs to the conversation but the key or the matrix does not give them this action. */
export class TaskCommentNotAllowedError extends ForbiddenError {
  override readonly code = 'TASK_COMMENT_NOT_ALLOWED';
  constructor(action: string) {
    super(`You may not ${action} in this conversation`);
  }
}

export class TaskCommentEmptyError extends BusinessRuleError {
  override readonly code = 'TASK_COMMENT_EMPTY';
  constructor() {
    super('A comment needs some text or a file');
  }
}

export class TaskCommentTooManyFilesError extends BusinessRuleError {
  override readonly code = 'TASK_COMMENT_TOO_MANY_FILES';
  constructor(readonly max: number) {
    super(`A comment may carry up to ${max} files`, { max });
  }
}

export class TaskCommentMentionInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_COMMENT_MENTION_INVALID';
  constructor() {
    super('A mention must name an active employee of the company');
  }
}

export class TaskCommentReplyInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_COMMENT_REPLY_INVALID';
  constructor() {
    super('Only a comment of this task can be answered, and a deleted one cannot');
  }
}

export class TaskCommentEditExpiredError extends ConflictError {
  override readonly code = 'TASK_COMMENT_EDIT_EXPIRED';
  constructor(readonly minutes: number) {
    super(`A comment can be changed or deleted by its author within ${minutes} minutes only`, { minutes });
  }
}

export class TaskCommentClosedError extends ConflictError {
  override readonly code = 'TASK_COMMENT_CLOSED';
  constructor() {
    super('The conversation of this task is closed');
  }
}

export class TaskCommentAlreadyDeletedError extends ConflictError {
  override readonly code = 'TASK_COMMENT_ALREADY_DELETED';
  constructor() {
    super('This comment was already deleted');
  }
}

export class TaskCommentFileInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_COMMENT_FILE_INVALID';
  constructor() {
    super('A file of the comment was not found among the files you uploaded');
  }
}
