/** In-process event: any change that affects what a user can do. */
export const ACCESS_CHANGED = 'access.changed';
/** In-process event: an employee was created, changed, deactivated or got other roles (the automatic roles may need a refresh). */
export const EMPLOYEES_CHANGED = 'employees.changed';
export interface AccessChangedEvent {
  userId?: string;
}
