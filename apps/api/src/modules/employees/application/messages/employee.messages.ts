/** Audit action names of the employees module. Services use these constants, never inline strings. */
export const EMPLOYEE_AUDIT = {
  created: 'employee.created',
  updated: 'employee.updated',
  activated: 'employee.activated',
  deactivated: 'employee.deactivated',
  terminated: 'employee.terminated',
  rolesChanged: 'employee.roles.changed',
  groupsChanged: 'employee.groups.changed',
  invited: 'employee.invited',
  profileUpdated: 'profile.updated',
  deactivatedContractEnded: 'employee.deactivated.contract_ended',
  accessRestored: 'employee.access_restored',
  fieldRulesChanged: 'employee_fields.changed',
  bulkUpdated: 'employee.bulk_updated',
  photoChanged: 'employee.photo.changed',
  photoRemoved: 'employee.photo.removed',
  assignmentChanged: 'employee.assignment.changed',
  assignmentApplied: 'employee.assignment.applied',
  assignmentCancelled: 'employee.assignment.cancelled',
} as const;

/** The reason kept in the placement history when the employee form changes the unit, the title or the manager without stating one. */
export const FORM_CHANGE_REASON = 'Edited from the employee form';
