import type { TitleIdentity } from '../types/career-profile.types';

/** The job titles of the structure, as this module needs them (implemented over the structure module's service). */
export abstract class TitleIdentityPort {
  /** Throws a not-found error when the title does not exist. */
  abstract identity(titleId: string): Promise<TitleIdentity>;
}
