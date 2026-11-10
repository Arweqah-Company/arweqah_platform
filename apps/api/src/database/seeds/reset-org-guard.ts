const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

type ResetEnv = {
  NODE_ENV?: string | undefined;
  DB_HOST?: string | undefined;
  DB_NAME?: string | undefined;
  ORG_RESET_CONFIRM?: string | undefined;
};

/**
 * The organization reset deletes live data, so it needs one of two things:
 * - an explicit development or test environment (an unset one is refused) and a database on this machine; or
 * - `ORG_RESET_CONFIRM` equal to the name of the database it is about to empty (typed on purpose, by `scripts/server/reset-org.sh`, after a backup).
 */
export function assertResetAllowed(env: ResetEnv): void {
  if (env.ORG_RESET_CONFIRM && env.ORG_RESET_CONFIRM === env.DB_NAME) return;
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') throw new Error('The organization reset is for development only: set NODE_ENV=development');
  if (!env.DB_HOST || !LOCAL_HOSTS.has(env.DB_HOST)) throw new Error('The organization reset only runs against a local database');
}
