/** In-process event: any change that affects what a user can do. */
export const ACCESS_CHANGED = 'access.changed';
/** In-process event: an employee was created, changed, deactivated or got other roles (the automatic roles may need a refresh). */
export const EMPLOYEES_CHANGED = 'employees.changed';
/** In-process event: a unit, level or job title of the organization was created, changed, moved or removed (the roles that follow it may need a refresh). */
export const ORG_CHANGED = 'org.changed';
export interface AccessChangedEvent {
  userId?: string;
}
