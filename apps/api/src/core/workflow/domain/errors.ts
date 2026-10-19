import { BusinessRuleError, ConflictError } from '../../../common/domain/domain-error';

export class TransitionNotAllowedError extends BusinessRuleError {
  override readonly code = 'TRANSITION_NOT_ALLOWED';
  constructor(event: string, state: string) {
    super(`"${event}" is not allowed while in "${state}"`);
  }
}

export class WorkflowConcurrencyError extends ConflictError {
  override readonly code = 'WORKFLOW_CHANGED';
  constructor() {
    super('This item was updated by someone else. Reload and try again.');
  }
}
