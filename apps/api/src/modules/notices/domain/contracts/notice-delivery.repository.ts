import type { AudienceSets } from '../rules/notice-audience.rules';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { NoticeRecord } from '../types/notice.types';

export interface DeliveryInsert {
  noticeId: string;
  userIds: string[];
  joinedAfterPublish: boolean;
}

/** The audience of a notice, worked out in set-based SQL, and the delivery of it into `notice_recipients`. */
export abstract class NoticeDeliveryRepository {
  /** How many active employees the rules reach. */
  abstract countAudience(sets: AudienceSets): Promise<number>;
  /** The people of a batch: the audience in a fixed order (by user id), `limit` of them from `offset`. */
  abstract audienceSlice(sets: AudienceSets, offset: number, limit: number): Promise<string[]>;
  /** The audience members the notice has not reached yet (the nightly pass), at most `limit` of them. */
  abstract missing(sets: AudienceSets, noticeId: string, limit: number): Promise<string[]>;
  /** Adds the people as recipients; the ones already there are left alone. Returns the ids actually added. */
  abstract addRecipients(data: DeliveryInsert, tx: TransactionContext): Promise<string[]>;
  /** Marks the people (among the recipients) as notified about the version; returns the ones that were not yet, so a re-run never notifies twice. */
  abstract markNotified(noticeId: string, userIds: string[], version: number, tx: TransactionContext): Promise<string[]>;
  abstract recipientCount(noticeId: string): Promise<number>;
  /** Published notices not archived whose first delivery finished (the nightly pass looks at those). */
  abstract catchUpCandidates(): Promise<NoticeRecord[]>;
  /** A new version of an announcement shows as new again: nobody has read it. */
  abstract clearReads(noticeId: string, tx: TransactionContext): Promise<void>;
  abstract markRead(noticeId: string, userId: string): Promise<void>;
  /** Acknowledges the current version: sets the time and the version once; answers whether the row exists (a person the notice did not reach has none). */
  abstract acknowledge(noticeId: string, userId: string, version: number): Promise<boolean>;
  /** The recipient row of a person, or null when the notice never reached them. */
  abstract recipient(noticeId: string, userId: string): Promise<{ readAt: Date | null; acknowledgedVersion: number | null } | null>;
}
