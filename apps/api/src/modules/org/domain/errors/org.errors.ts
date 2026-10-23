import { BusinessRuleError, ConflictError } from '../../../../common/domain/domain-error';

export class InvalidOrgHierarchyError extends BusinessRuleError {
  override readonly code = 'INVALID_ORG_HIERARCHY';
}

export class InvalidPlacementError extends BusinessRuleError {
  override readonly code = 'INVALID_PLACEMENT';
}

export class CompanyCodeTakenError extends ConflictError {
  override readonly code = 'COMPANY_CODE_TAKEN';
  constructor() {
    super('Company code is already used');
  }
}

export class CompanyInUseError extends BusinessRuleError {
  override readonly code = 'COMPANY_IN_USE';
  constructor() {
    super('Move or remove the company\'s employees and units first');
  }
}

export class OrgNodeHasTicketsError extends BusinessRuleError {
  override readonly code = 'ORG_NODE_HAS_TICKETS';
  constructor() {
    super('A department with a ticket desk that receives tickets, or with open tickets, cannot be moved or deleted');
  }
}

export class OrgNodeInUseError extends BusinessRuleError {
  override readonly code = 'ORG_NODE_IN_USE';
  constructor() {
    super('Move or remove its sub-units and employees first');
  }
}

export class LastJobTitleError extends BusinessRuleError {
  override readonly code = 'LAST_JOB_TITLE';
  constructor() {
    super('A unit that accepts employees needs at least one job title');
  }
}

export class JobTitleInUseError extends BusinessRuleError {
  override readonly code = 'JOB_TITLE_IN_USE';
  constructor() {
    super('Move the employees with this job title first');
  }
}

/** The change removes or detaches data; the client must show the impact and send the confirmation. */
export class OrgImpactConfirmationRequiredError extends ConflictError {
  override readonly code = 'ORG_IMPACT_CONFIRMATION_REQUIRED';
  constructor(impact: unknown) {
    super('This change affects existing data and needs confirmation', impact);
  }
}

/** The data changed between the preview and the confirmation. */
export class OrgImpactChangedError extends ConflictError {
  override readonly code = 'ORG_IMPACT_CHANGED';
  constructor(impact: unknown) {
    super('The affected data changed; review the new impact and confirm again', impact);
  }
}

export class EmployeesDecisionRequiredError extends BusinessRuleError {
  override readonly code = 'EMPLOYEES_DECISION_REQUIRED';
  constructor() {
    super('Choose what happens to the affected employees: transfer them or delete them');
  }
}

export class InvalidEmployeesDecisionError extends BusinessRuleError {
  override readonly code = 'INVALID_EMPLOYEES_DECISION';
}

export class OrgLevelsNotEmptyError extends ConflictError {
  override readonly code = 'ORG_LEVELS_NOT_EMPTY';
  constructor() {
    super('The company already has units; change its levels from the levels form instead');
  }
}
