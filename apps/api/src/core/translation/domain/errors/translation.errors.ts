import { BusinessRuleError, ExternalServiceError } from '../../../../common/domain/domain-error';

export class TranslationUnavailableError extends ExternalServiceError {
  override readonly code = 'TRANSLATION_UNAVAILABLE';
  /** `cause` is what the provider said; it stays on the server (the dashboard's test shows it, the public route never does). */
  constructor(cause?: string) {
    super('Translation is not available');
    this.cause = cause;
  }
}

export class TranslationRateLimitedError extends BusinessRuleError {
  override readonly code = 'TRANSLATION_RATE_LIMITED';
  constructor() {
    super('Too many translation requests, try again in a minute');
  }
}
