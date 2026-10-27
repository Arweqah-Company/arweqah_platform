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
  constructor(what: 'text' | 'to') {
    super(`The test needs "${what}"`);
  }
}

export class ProviderTestRateLimitedError extends BusinessRuleError {
  override readonly code = 'PROVIDER_TEST_RATE_LIMITED';
  constructor() {
    super('Too many provider tests, try again in a minute');
  }
}
