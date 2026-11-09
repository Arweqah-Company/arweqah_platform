import { BusinessRuleError, ExternalServiceError } from '../../../../common/domain/domain-error';

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

export class AiNotConfiguredError extends BusinessRuleError {
  override readonly code = 'AI_NOT_CONFIGURED';
  constructor() {
    super('No AI service is switched on in the settings');
  }
}

/** `cause` is what the service said (the key already removed); the caller may show it to someone who may see the settings. */
export class AiUnavailableError extends ExternalServiceError {
  override readonly code = 'AI_UNAVAILABLE';
  constructor(cause: string) {
    super('The AI service did not give a usable answer', { cause });
  }
}
