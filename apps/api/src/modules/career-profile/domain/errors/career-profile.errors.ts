import { BusinessRuleError, ConflictError, ForbiddenError } from '../../../../common/domain/domain-error';

export class CareerContentStaleError extends ConflictError {
  override readonly code = 'CAREER_CONTENT_STALE';
  constructor(expected: number, actual: number) {
    super(`The content changed since version ${expected} (now ${actual}): reload it and apply the edit again`);
  }
}

export class CareerContentNotReadyError extends BusinessRuleError {
  override readonly code = 'CAREER_CONTENT_NOT_READY';
  constructor(problems: readonly string[]) {
    super('The career path is incomplete and cannot be set ready', { problems });
  }
}

export class TitleFileNeedsReviewError extends BusinessRuleError {
  override readonly code = 'TITLE_FILE_NEEDS_REVIEW';
  constructor(problems: readonly string[]) {
    super('The title file has parts that need review and was not saved', { problems });
  }
}

export class CareerAckAsAnotherError extends ForbiddenError {
  override readonly code = 'CAREER_ACK_AS_ANOTHER';
  constructor() {
    super('A career path is acknowledged by the person themselves, not in a «sign in as» session');
  }
}

export class CareerPathNotAvailableError extends BusinessRuleError {
  override readonly code = 'CAREER_PATH_NOT_AVAILABLE';
  constructor() {
    super('There is no ready career path for your job title to acknowledge');
  }
}

export class CareerPathNotReadyError extends BusinessRuleError {
  override readonly code = 'CAREER_PATH_NOT_READY';
  constructor() {
    super('Only a career path that is set ready can be reopened for acknowledgement');
  }
}
