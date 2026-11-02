export abstract class AllowedEmailDomainsRepository {
  abstract all(): Promise<string[]>;
  /** Replaces the whole list. */
  abstract replace(domains: string[], createdBy: string | null): Promise<void>;
}
