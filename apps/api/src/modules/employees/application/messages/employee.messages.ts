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
} as const;
