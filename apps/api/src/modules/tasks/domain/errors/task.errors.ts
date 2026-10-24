import { BusinessRuleError, ConflictError, NotFoundError } from '../../../../common/domain/domain-error';

export class TaskNotFoundError extends NotFoundError {
  constructor() {
    super('Task');
  }
}

export class TaskTagNotFoundError extends NotFoundError {
  constructor() {
    super('Task tag');
  }
}

export class TaskRevisionConflictError extends ConflictError {
  override readonly code = 'TASK_REVISION_CONFLICT';
  constructor() {
    super('The task was changed by someone else. Reload and try again');
  }
}

/** A move the rules refuse; `reason` says why in a code the screen can translate. */
export class TaskTransitionNotAllowedError extends BusinessRuleError {
  override readonly code = 'TASK_TRANSITION_NOT_ALLOWED';
  constructor(from: string, to: string, readonly reason: string) {
    super(`A task cannot move from ${from} to ${to} (${reason})`, { from, to, reason });
  }
}

export class TaskAssignmentNotAllowedError extends BusinessRuleError {
  override readonly code = 'TASK_ASSIGNMENT_NOT_ALLOWED';
  constructor() {
    super('You cannot give a task to this person');
  }
}

export class TaskAssigneeInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_ASSIGNEE_INVALID';
  constructor() {
    super('The assignee must be an active employee of the same company');
  }
}

export class TaskNoteRequiredError extends BusinessRuleError {
  override readonly code = 'TASK_NOTE_REQUIRED';
  constructor() {
    super('A note is required when sending a task back from review');
  }
}

export class TaskCompletionDateRequiredError extends BusinessRuleError {
  override readonly code = 'TASK_COMPLETION_DATE_REQUIRED';
  constructor(readonly backdateDays: number) {
    super(`This task is more than ${backdateDays} days late: state the real completion date`, { backdateDays });
  }
}

export class TaskBackdateTooFarError extends BusinessRuleError {
  override readonly code = 'TASK_BACKDATE_TOO_FAR';
  constructor(readonly backdateDays: number) {
    super(`A date can be recorded up to ${backdateDays} days back only`, { backdateDays });
  }
}

export class TaskStateInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_STATE_INVALID';
  constructor(action: string, status: string) {
    super(`A ${status} task cannot be changed by "${action}"`);
  }
}

export class TaskObjectionNotAllowedError extends BusinessRuleError {
  override readonly code = 'TASK_OBJECTION_NOT_ALLOWED';
  constructor(reason: string) {
    super(`You cannot object to this task (${reason})`, { reason });
  }
}

export class TaskObjectionNotFoundError extends NotFoundError {
  constructor() {
    super('Open objection');
  }
}

export class TaskNotArchivedError extends ConflictError {
  override readonly code = 'TASK_NOT_ARCHIVED';
  constructor() {
    super('The task is not archived');
  }
}

export class TaskDueDateInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_DUE_DATE_INVALID';
  constructor() {
    super('The due date cannot be in the past');
  }
}

export class TaskTagInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_TAG_INVALID';
  constructor() {
    super('The tag is not available for this task');
  }
}

export class TaskDepartmentInvalidError extends BusinessRuleError {
  override readonly code = 'TASK_DEPARTMENT_INVALID';
  constructor() {
    super('A tag belongs to a department of the organization structure');
  }
}

export class TaskNotApprovableError extends BusinessRuleError {
  override readonly code = 'TASK_NOT_APPROVABLE';
  constructor() {
    super('This task is not waiting for your approval');
  }
}

export class TaskReassignRequiredError extends BusinessRuleError {
  override readonly code = 'TASK_REASSIGN_REQUIRED';
  constructor() {
    super('Accepting an objection gives the task to somebody else: choose who');
  }
}

export class TaskTagInUseError extends ConflictError {
  override readonly code = 'TASK_TAG_IN_USE';
  constructor() {
    super('Tasks use this tag; turn it off instead of deleting it');
  }
}

export class TaskPolicyCompanyError extends BusinessRuleError {
  override readonly code = 'TASK_POLICY_COMPANY_REQUIRED';
  constructor() {
    super('Choose the company whose task policy you mean');
  }
}
