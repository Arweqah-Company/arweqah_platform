import { BusinessRuleError, ConflictError } from '../../../../common/domain/domain-error';

export class EvalFileNeedsReviewError extends BusinessRuleError {
  override readonly code = 'EVAL_FILE_NEEDS_REVIEW';
  constructor(problems: readonly string[]) {
    super('The evaluation file has parts that failed a check and was not saved', { problems });
  }
}

export class TemplateNeedsReviewError extends BusinessRuleError {
  override readonly code = 'TEMPLATE_NEEDS_REVIEW';
  constructor(problems: readonly string[]) {
    super('The template has parts that failed a check and was not saved', { problems });
  }
}

export class ReminderLimitError extends BusinessRuleError {
  override readonly code = 'REMINDER_LIMIT';
  constructor(limit: number) {
    super(`The cycle can keep at most ${limit} reminders: remove one first`, { limit });
  }
}

export class CycleAlreadyOpenError extends ConflictError {
  override readonly code = 'CYCLE_ALREADY_OPEN';
  constructor() {
    super('A cycle is already open: close it before opening another');
  }
}

export class CycleYearExistsError extends ConflictError {
  override readonly code = 'CYCLE_YEAR_EXISTS';
  constructor(year: number) {
    super(`A cycle for ${year} already exists`);
  }
}

export class CycleNotReadyError extends BusinessRuleError {
  override readonly code = 'CYCLE_NOT_READY';
  constructor(readiness: unknown) {
    super('The cycle cannot be opened: the evaluation file is not complete', { readiness });
  }
}

export class CycleNotOpenError extends ConflictError {
  override readonly code = 'CYCLE_NOT_OPEN';
  constructor() {
    super('There is no cycle in progress');
  }
}

export class CycleStageEndedError extends ConflictError {
  override readonly code = 'CYCLE_AT_LAST_STAGE';
  constructor() {
    super('The cycle is at its last stage: close it');
  }
}

export class CycleStageChangedError extends ConflictError {
  override readonly code = 'CYCLE_STAGE_CHANGED';
  constructor() {
    super('The stage of the cycle changed while you were acting: reload and try again');
  }
}

export class CycleDateInvalidError extends BusinessRuleError {
  override readonly code = 'CYCLE_DATE_INVALID';
  constructor(problems: readonly string[]) {
    super('The date does not fit the cycle', { problems });
  }
}

export class SelfEvaluationClosedError extends ConflictError {
  override readonly code = 'SELF_EVALUATION_CLOSED';
  constructor() {
    super('The self-evaluation can no longer be changed: its stage ended or the manager started');
  }
}

export class SelfEvaluationInvalidError extends BusinessRuleError {
  override readonly code = 'SELF_EVALUATION_INVALID';
  constructor(problems: readonly { field: string; code: string }[]) {
    super('The self-evaluation is not complete', { problems });
  }
}

export class EvalFileAiRateLimitedError extends BusinessRuleError {
  override readonly code = 'EVAL_FILE_AI_RATE_LIMITED';
  constructor() {
    super('Too many evaluation files were sent to the AI service, try again later');
  }
}
