import { BusinessRuleError } from '../../../common/domain/domain-error';

export class EmailDomainNotAllowedError extends BusinessRuleError {
  override readonly code = 'EMAIL_DOMAIN_NOT_ALLOWED';
  constructor(domain: string) {
    super(`The e-mail domain "${domain}" is not one the platform allows`);
  }
}
