import { AsyncLocalStorage } from 'node:async_hooks';

/** The address the current request came from: every audit entry written while it runs carries it, without each service passing it along. */
export const requestOrigin = new AsyncLocalStorage<{ ip: string | null }>();
