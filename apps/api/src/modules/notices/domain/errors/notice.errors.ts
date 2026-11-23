import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';

export class NoticeNotFoundError extends NotFoundError {
  constructor() {
    super('Notice');
  }
}

export class NoticeChannelNotFoundError extends NotFoundError {
  constructor() {
    super('Notice channel');
  }
}

export class NoticeNotChannelWriterError extends ForbiddenError {
  override readonly code = 'NOTICE_NOT_CHANNEL_WRITER';
  constructor() {
    super('You are not a writer in this channel');
  }
}

export class NoticeNotAuthorError extends ForbiddenError {
  override readonly code = 'NOTICE_NOT_AUTHOR';
  constructor() {
    super('Only the writer of the notice can do this');
  }
}

export class NoticeSelfApprovalError extends ForbiddenError {
  override readonly code = 'NOTICE_SELF_APPROVAL';
  constructor() {
    super('You cannot approve or reject your own notice');
  }
}

export class NoticeAckImpersonationError extends ForbiddenError {
  override readonly code = 'NOTICE_ACK_IMPERSONATION';
  constructor() {
    super('An acknowledgement cannot be given while signed in as another employee');
  }
}

/** The notice is not in a state the action works on; the code says which action, so the screen can word it. */
export class NoticeStateError extends ConflictError {
  constructor(
    override readonly code: 'NOTICE_NOT_EDITABLE' | 'NOTICE_NOT_DRAFT' | 'NOTICE_NOT_PENDING' | 'NOTICE_NOT_PUBLISHED' | 'NOTICE_NOT_REVISING' | 'NOTICE_ARCHIVED',
    status: string,
  ) {
    super(`This action is not possible while the notice is "${status}"`, { status });
  }
}

export class NoticeRevisionConflictError extends ConflictError {
  override readonly code = 'NOTICE_REVISION_CONFLICT';
  constructor() {
    super('The notice was changed by someone else. Reload and try again');
  }
}

export class NoticeNoAckRequiredError extends BusinessRuleError {
  override readonly code = 'NOTICE_NO_ACK_REQUIRED';
  constructor() {
    super('This notice is an announcement: it needs no acknowledgement');
  }
}

export class NoticePublishDateError extends BusinessRuleError {
  constructor(override readonly code: 'NOTICE_PUBLISH_DATE_REQUIRED' | 'NOTICE_PUBLISH_DATE_PAST') {
    super(code === 'NOTICE_PUBLISH_DATE_PAST' ? 'The publish date cannot be in the past' : 'The publish date is required');
  }
}

export class NoticeAudienceEmptyError extends BusinessRuleError {
  override readonly code = 'NOTICE_AUDIENCE_EMPTY';
  constructor() {
    super('The audience reaches nobody: choose at least one person');
  }
}

export class NoticeAudienceInvalidError extends BusinessRuleError {
  override readonly code = 'NOTICE_AUDIENCE_INVALID';
  constructor() {
    super('The audience names a unit, title or group that does not exist');
  }
}

export class NoticeFilesInvalidError extends BusinessRuleError {
  override readonly code = 'NOTICE_FILES_INVALID';
  constructor() {
    super('An attachment is not one of your uploaded files');
  }
}

export class NoticeWriterExistsError extends ConflictError {
  override readonly code = 'NOTICE_WRITER_EXISTS';
  constructor() {
    super('This employee is already a writer in this channel');
  }
}

export class NoticeWriterInactiveError extends BusinessRuleError {
  override readonly code = 'NOTICE_WRITER_INACTIVE';
  constructor() {
    super('A writer must be an active employee');
  }
}

export class NoticeWriterNoAccountError extends BusinessRuleError {
  override readonly code = 'NOTICE_WRITER_NO_ACCOUNT';
  constructor() {
    super('This employee has no sign-in account yet');
  }
}

export class NoticeBodyEmptyError extends BusinessRuleError {
  override readonly code = 'NOTICE_BODY_EMPTY';
  constructor() {
    super('The text of the notice has nothing to read once the formatting is taken away');
  }
}

export class NoticeChannelDisabledError extends ConflictError {
  override readonly code = 'NOTICE_CHANNEL_DISABLED';
  constructor() {
    super('This channel is disabled');
  }
}

export class NoticeChannelHasNoticesError extends ConflictError {
  override readonly code = 'NOTICE_CHANNEL_HAS_NOTICES';
  constructor() {
    super('A channel that has notices cannot be deleted; disable it instead');
  }
}

export class NoticeChannelNameExistsError extends ConflictError {
  override readonly code = 'NOTICE_CHANNEL_NAME_EXISTS';
  constructor() {
    super('Another channel has this name');
  }
}
