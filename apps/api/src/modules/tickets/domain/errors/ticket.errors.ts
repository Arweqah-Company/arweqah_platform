import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';

export class TicketNotFoundError extends NotFoundError {
  constructor() {
    super('Ticket');
  }
}

export class DeskNotFoundError extends NotFoundError {
  constructor() {
    super('Ticket desk');
  }
}

export class NotADepartmentError extends BusinessRuleError {
  override readonly code = 'NOT_A_DEPARTMENT';
  constructor() {
    super('Only a department can receive tickets');
  }
}

export class DeskStoppedError extends BusinessRuleError {
  override readonly code = 'DESK_STOPPED';
  constructor() {
    super('This department does not receive tickets');
  }
}

export class DeskPausedError extends BusinessRuleError {
  override readonly code = 'DESK_PAUSED';
  constructor() {
    super('This department has paused receiving tickets for now');
  }
}

export class DeskNotStartedError extends BusinessRuleError {
  override readonly code = 'DESK_NOT_STARTED';
  constructor() {
    super('This department has not started working yet');
  }
}

export class DeskNoManagerError extends BusinessRuleError {
  override readonly code = 'DESK_NO_MANAGER';
  constructor() {
    super('This department has no manager yet, so it cannot receive tickets');
  }
}

export class TypeInactiveError extends BusinessRuleError {
  override readonly code = 'TYPE_INACTIVE';
  constructor() {
    super('This ticket type is not available');
  }
}

export class PersonalNotAcceptedError extends BusinessRuleError {
  override readonly code = 'PERSONAL_NOT_ACCEPTED';
  constructor() {
    super('This department does not accept personal requests');
  }
}

/** A personal ticket is invisible to the desk manager, so somebody active must be assigned to it. */
export class TypeNoHandlerError extends BusinessRuleError {
  override readonly code = 'TYPE_NO_HANDLER';
  constructor() {
    super('A personal ticket type needs an active employee assigned to it');
  }
}

export class AssigneeInvalidError extends BusinessRuleError {
  override readonly code = 'ASSIGNEE_INVALID';
  constructor() {
    super('The assignee must be an active employee');
  }
}

export class DueDateTooEarlyError extends BusinessRuleError {
  override readonly code = 'DUE_DATE_TOO_EARLY';
  constructor(earliest: string) {
    super(`The earliest date this department accepts is ${earliest}`, { earliest });
  }
}

export class TicketStateInvalidError extends BusinessRuleError {
  override readonly code = 'TICKET_STATE_INVALID';
  constructor(action: string, status: string) {
    super(`A ${status} ticket cannot be changed by "${action}"`);
  }
}

export class ReopenWindowExpiredError extends BusinessRuleError {
  override readonly code = 'REOPEN_WINDOW_EXPIRED';
  constructor() {
    super('The time allowed for reopening this ticket has passed');
  }
}

export class TicketRevisionConflictError extends ConflictError {
  override readonly code = 'TICKET_REVISION_CONFLICT';
  constructor() {
    super('The ticket was changed by someone else. Reload and try again');
  }
}

export class NotDeskManagerError extends BusinessRuleError {
  override readonly code = 'NOT_DESK_MANAGER';
  constructor() {
    super('Only the manager of this department can do this');
  }
}

/** The person may reply to the ticket but their role lacks the key of this action (answering a reply, or mentioning). */
export class TicketCommentNotAllowedError extends ForbiddenError {
  override readonly code = 'TICKET_COMMENT_NOT_ALLOWED';
  constructor(action: string) {
    super(`You may not ${action} in this ticket`);
  }
}

export class TicketMentionInvalidError extends BusinessRuleError {
  override readonly code = 'TICKET_MENTION_INVALID';
  constructor() {
    super('Only active employees of the ticket’s company can be mentioned, and nobody outside the two sides of a personal ticket');
  }
}

export class TicketReplyTargetInvalidError extends BusinessRuleError {
  override readonly code = 'TICKET_REPLY_TARGET_INVALID';
  constructor() {
    super('That reply cannot be answered');
  }
}
