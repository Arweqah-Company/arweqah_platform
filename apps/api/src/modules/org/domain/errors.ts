import { BusinessRuleError, ConflictError } from '../../../common/domain/domain-error';

export class OrgUnitInUseError extends BusinessRuleError {
  override readonly code = 'ORG_UNIT_IN_USE';
  constructor() {
    super('Move or remove its sub-units and members first');
  }
}

export class InvalidOrgHierarchyError extends BusinessRuleError {
  override readonly code = 'INVALID_ORG_HIERARCHY';
}

export class BranchCodeTakenError extends ConflictError {
  override readonly code = 'BRANCH_CODE_TAKEN';
  constructor() {
    super('Branch code is already used');
  }
}
