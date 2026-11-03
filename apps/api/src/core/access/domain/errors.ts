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

/** The page is hidden from every role of the caller (see the "Page visibility" admin page). */
export class PageHiddenError extends ForbiddenError {
  override readonly code = 'PAGE_HIDDEN';
  constructor() {
    super('This page is not available to your role');
  }
}

/** A role that manages pages sees every page, so nothing can be hidden from it. */
export class RolePagesLockedError extends BusinessRuleError {
  override readonly code = 'ROLE_PAGES_LOCKED';
  constructor() {
    super('Pages cannot be hidden from a role that manages page visibility');
  }
}

export class DerivedRoleError extends BusinessRuleError {
  override readonly code = 'DERIVED_ROLE';
  constructor(reason: string) {
    super(reason);
  }
}

export class RoleTemplateError extends BusinessRuleError {
  override readonly code = 'ROLE_TEMPLATE_INVALID';
  constructor() {
    super('A role made for a job title or a level cannot be the template of another');
  }
}

export class PastEndDateError extends BusinessRuleError {
  override readonly code = 'PAST_END_DATE';
  constructor() {
    super('The end date cannot be in the past');
  }
}

/** «Sign in as» is switched off in the security settings. */
export class ImpersonationDisabledError extends BusinessRuleError {
  override readonly code = 'IMPERSONATION_DISABLED';
  constructor() {
    super('Signing in as another employee is switched off');
  }
}

/** The person cannot be signed in as: themselves, or an account that is not active. */
export class ImpersonationTargetError extends BusinessRuleError {
  override readonly code = 'IMPERSONATION_TARGET_INVALID';
  constructor() {
    super('You cannot sign in as this account');
  }
}

/** Already working as someone else: go back to your own account first. */
export class ImpersonationNestedError extends BusinessRuleError {
  override readonly code = 'IMPERSONATION_NESTED';
  constructor() {
    super('Go back to your own account before signing in as someone else');
  }
}

/** The action is not allowed while working as another employee (roles, security, the person's own sign-in). */
export class ImpersonationForbiddenError extends ForbiddenError {
  override readonly code = 'IMPERSONATION_FORBIDDEN';
  constructor() {
    super('This action is not allowed while you are signed in as another employee');
  }
}

/** The «sign in as» session ran out (idle) or the feature was switched off: only going back to your own account works. */
export class ImpersonationEndedError extends ForbiddenError {
  override readonly code = 'IMPERSONATION_ENDED';
  constructor() {
    super('This session ended. Go back to your own account');
  }
}
