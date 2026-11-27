import { BusinessRuleError } from '../../../../common/domain/domain-error';

export class ProblemReportsOffError extends BusinessRuleError {
  override readonly code = 'PROBLEM_REPORTS_OFF';
  constructor() {
    super('Problem reports are not available now');
  }
}

export class ProblemReportTypeInvalidError extends BusinessRuleError {
  override readonly code = 'PROBLEM_REPORT_TYPE_INVALID';
  constructor() {
    super('The chosen ticket type cannot receive problem reports (it must belong to a department that receives tickets, and not be personal)');
  }
}

export class ProblemReportRateLimitedError extends BusinessRuleError {
  override readonly code = 'PROBLEM_REPORT_RATE_LIMITED';
  constructor() {
    super('Too many problem reports in the last hour');
  }
}
