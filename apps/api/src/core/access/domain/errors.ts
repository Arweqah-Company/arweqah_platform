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

/** A route of the admin pages was called while platform admin mode is off (or has expired). */
export class AdminModeRequiredError extends ForbiddenError {
  override readonly code = 'ADMIN_MODE_REQUIRED';
  constructor() {
    super('Turn on platform admin mode to continue');
  }
}

/** The person has no administrative capability, so there is no admin mode for them. */
export class AdminModeNotAllowedError extends ForbiddenError {
  override readonly code = 'ADMIN_MODE_NOT_ALLOWED';
  constructor() {
    super('Platform admin mode is not available for this account');
  }
}

/** The code is right but already used: wait for the next one (not counted as a failed attempt). */
export class CodeAlreadyUsedError extends BusinessRuleError {
  override readonly code = 'CODE_ALREADY_USED';
  constructor() {
    super('This code was already used. Wait for the next code in your app');
  }
}
