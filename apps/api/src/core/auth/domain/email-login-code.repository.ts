/** The e-mailed sign-in codes (one row per person). */
export abstract class EmailLoginCodeRepository {
  /**
   * Stores a new code in place of the old one, unless the old one was made less than `cooldownMs` ago.
   * Atomic, so two servers cannot both send; false when it is too soon.
   */
  abstract issue(input: { userId: string; codeHash: string; expiresAt: Date; now: Date; cooldownMs: number }): Promise<boolean>;
  /** Spends the code when it matches, is not expired and has tries left; otherwise counts a wrong try. */
  abstract consume(input: { userId: string; codeHash: string; now: Date; maxAttempts: number }): Promise<boolean>;
}
