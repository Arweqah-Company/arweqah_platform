import { AsyncLocalStorage } from 'node:async_hooks';

/** While a platform administrator works as another employee, every audit entry of that request also names the administrator. */
export const impersonationStamp = new AsyncLocalStorage<{ impersonatedBy: string }>();
