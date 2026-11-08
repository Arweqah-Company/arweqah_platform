import type { CareerAckReason } from '@arweqah-platform/shared';

export interface AckFacts {
  /** The employee's latest acknowledgement of the title they hold now. */
  latest: { acknowledgedAt: Date } | null;
  /** When HR last asked the holders of that title to acknowledge again. */
  reopenedAt: Date | null;
  /** True when the employee has acknowledged any title before. */
  everAcknowledged: boolean;
}

/**
 * Whether the employee still has to acknowledge the career path of their title, and why (FR-112): nothing acknowledged for this title
 * (the first sign-in, or the title changed since the last one), or HR reopened it after the employee's last acknowledgement.
 */
export function acknowledgementState(facts: AckFacts): { pending: boolean; reason: CareerAckReason | null } {
  if (!facts.latest) return { pending: true, reason: facts.everAcknowledged ? 'title' : 'first' };
  if (facts.reopenedAt && facts.reopenedAt > facts.latest.acknowledgedAt) return { pending: true, reason: 'reopened' };
  return { pending: false, reason: null };
}
