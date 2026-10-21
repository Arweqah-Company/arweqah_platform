import { BusinessRuleError, ForbiddenError } from '../../../common/domain/domain-error';

export class UnknownPermissionError extends BusinessRuleError {
  override readonly code = 'UNKNOWN_PERMISSION';
  constructor(key: string) {
    super(`Permission "${key}" does not exist`);
  }
}

export class ScopeNotAllowedError extends BusinessRuleError {
  override readonly code = 'SCOPE_NOT_ALLOWED';
  constructor(key: string, scope: string) {
    super(`Scope "${scope}" is not allowed for permission "${key}"`);
  }
}

/** The session exists but the one-time code of the authenticator app was not entered yet. */
export class MfaRequiredError extends ForbiddenError {
  override readonly code = 'MFA_REQUIRED';
  constructor() {
    super('Enter the code from your authenticator app to continue');
  }
}

export class AccountDisabledError extends ForbiddenError {
  override readonly code = 'ACCOUNT_DISABLED';
  constructor() {
    super('This account is disabled');
  }
}
