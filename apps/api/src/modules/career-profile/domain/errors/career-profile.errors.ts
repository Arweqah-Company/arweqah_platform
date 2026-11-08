import { BusinessRuleError, ConflictError } from '../../../../common/domain/domain-error';

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
