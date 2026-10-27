import { BusinessRuleError, ConflictError, ForbiddenError } from '../../../../common/domain/domain-error';

export class TemplateUnknownVariableError extends BusinessRuleError {
  override readonly code = 'TEMPLATE_UNKNOWN_VARIABLE';
  constructor(variables: string[]) {
    super('The message uses variables this template cannot fill', { variables });
  }
}

export class TemplateMissingVariableError extends BusinessRuleError {
  override readonly code = 'TEMPLATE_MISSING_VARIABLE';
  constructor(variables: string[]) {
    super('The message must keep these variables', { variables });
  }
}

export class TemplateInvalidContentError extends BusinessRuleError {
  override readonly code = 'TEMPLATE_INVALID_CONTENT';
  constructor(reason: string) {
    super(`The message content is not valid: ${reason}`);
  }
}

export class TemplateTestRateLimitedError extends BusinessRuleError {
  override readonly code = 'TEMPLATE_TEST_RATE_LIMITED';
  constructor() {
    super('Too many test messages, try again in a minute');
  }
}

export class TemplateSelfApprovalError extends ForbiddenError {
  override readonly code = 'TEMPLATE_SELF_APPROVAL';
  constructor() {
    super('A change must be approved by someone other than who made it');
  }
}

export class TemplateNothingPendingError extends ConflictError {
  override readonly code = 'TEMPLATE_NOTHING_PENDING';
  constructor() {
    super('There is no change waiting for approval');
  }
}
