/** In-process event: any change that affects what a user can do. */
export const ACCESS_CHANGED = 'access.changed';
export interface AccessChangedEvent {
  userId?: string;
}
