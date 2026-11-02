import { BusinessRuleError } from '../../../../common/domain/domain-error';

export class ProviderIncompleteError extends BusinessRuleError {
  override readonly code = 'PROVIDER_INCOMPLETE';
  constructor(missing: string[], invalid: string[]) {
    super('The provider data is incomplete', { missing, invalid });
  }
}

export class ProviderNotTestedError extends BusinessRuleError {
  override readonly code = 'PROVIDER_NOT_TESTED';
  constructor() {
    super('The provider must pass a test with its current data before it can be activated');
  }
}

export class ProviderTestInputError extends BusinessRuleError {
  override readonly code = 'PROVIDER_TEST_INPUT';
  constructor(what: 'text' | 'to' | 'captchaToken') {
    super(`The test needs "${what}"`);
  }
}

export class ProviderTestRateLimitedError extends BusinessRuleError {
  override readonly code = 'PROVIDER_TEST_RATE_LIMITED';
  constructor() {
    super('Too many provider tests, try again in a minute');
  }
}

/** One message for every reason (missing, wrong, used, expired): it never tells a bot which part failed. */
export class CaptchaFailedError extends BusinessRuleError {
  override readonly code = 'CAPTCHA_FAILED';
  constructor() {
    super('The bot check failed, try again');
  }
}
