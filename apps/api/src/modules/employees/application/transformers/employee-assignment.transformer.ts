import type { BilingualName, EmployeeAssignmentDto } from '@arweqah-platform/shared';
import type { EmployeeAssignment } from '../../domain/entities/employee-assignment.entity';
import { statusOf } from '../../domain/rules/assignment.rules';

/** The id of the unit, job title or manager a period holds. */
export function valueOf(row: Pick<EmployeeAssignment, 'field' | 'orgNodeId' | 'jobTitleId' | 'managerEmployeeId'>): string | null {
  if (row.field === 'org_node') return row.orgNodeId;
  return row.field === 'job_title' ? row.jobTitleId : row.managerEmployeeId;
}

/** The names a period shows beside its ids. */
export interface PeriodNames {
  value: BilingualName | null;
  createdByName: string | null;
}

export function toAssignmentDto(row: EmployeeAssignment, today: string, names: PeriodNames): EmployeeAssignmentDto {
  return {
    id: row.id,
    field: row.field,
    valueId: valueOf(row),
    value: names.value,
    validFrom: row.validFrom,
    validTo: row.validTo,
    reason: row.reason,
    createdBy: row.createdBy,
    createdByName: names.createdByName,
    status: statusOf(row, today),
  };
}
