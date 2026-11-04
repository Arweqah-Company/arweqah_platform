import type { EmployeeFieldRule } from '../entities/employee-field-rule.entity';

export abstract class EmployeeFieldRuleRepository {
  abstract all(): Promise<EmployeeFieldRule[]>;
  /** Rewrites the rows of the given fields in one transaction. */
  abstract save(rules: { field: string; editableBySelf: boolean; editableByHr: boolean }[], updatedBy: string): Promise<void>;
}
