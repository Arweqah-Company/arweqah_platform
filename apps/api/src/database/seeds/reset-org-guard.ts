const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * The organization reset deletes live data, so it needs both: an explicit development or test environment (an unset one is refused) and a database on this machine.
 */
export function assertResetAllowed(env: { NODE_ENV?: string | undefined; DB_HOST?: string | undefined }): void {
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') throw new Error('The organization reset is for development only: set NODE_ENV=development');
  if (!env.DB_HOST || !LOCAL_HOSTS.has(env.DB_HOST)) throw new Error('The organization reset only runs against a local database');
}
