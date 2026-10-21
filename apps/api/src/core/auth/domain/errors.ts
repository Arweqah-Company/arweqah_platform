import { BusinessRuleError, DomainError, NotFoundError } from '../../../common/domain/domain-error';

export class InvalidCodeError extends DomainError {
  readonly code = 'INVALID_CODE';
  constructor() {
    super('The code is not valid');
  }
}

/** Too many wrong codes: the authenticator is locked for a while. */
export class AuthenticatorLockedError extends DomainError {
  readonly code = 'AUTHENTICATOR_LOCKED';
  constructor() {
    super('Too many attempts. Try again in a few minutes');
  }
}

export class AlreadyEnrolledError extends BusinessRuleError {
  override readonly code = 'ALREADY_ENROLLED';
  constructor() {
    super('An authenticator app is already enabled for this account');
  }
}

export class NoEnrollmentInProgressError extends BusinessRuleError {
  override readonly code = 'NO_ENROLLMENT_IN_PROGRESS';
  constructor() {
    super('Start the enrollment first');
  }
}

/** Unknown, used, expired or revoked invitation: one answer for all, so links reveal nothing. */
export class InvitationInvalidError extends NotFoundError {
  constructor() {
    super('Invitation');
  }
}
