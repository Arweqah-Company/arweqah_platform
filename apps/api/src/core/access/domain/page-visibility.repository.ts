export abstract class PageVisibilityRepository {
  /** Pages hidden by every role of the user (a person with no role sees everything). */
  abstract hiddenForUser(userId: string): Promise<string[]>;
  /** Every rule as role id → hidden page keys. */
  abstract allRules(): Promise<Map<string, string[]>>;
  /** Replaces the hidden pages of one role. */
  abstract replaceForRole(roleId: string, pageKeys: string[]): Promise<void>;
}
