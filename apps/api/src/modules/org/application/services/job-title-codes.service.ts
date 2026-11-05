import { Injectable } from '@nestjs/common';
import type { TitleTrack } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { JobTitleRepository } from '../../domain/contracts/job-title.repository';
import { nextTitleCode } from '../../domain/rules/job-title.rules';

/** What a title needs to get a code: its grade and track (a title with neither stays without one). */
export interface GradedTitle {
  grade?: number | null | undefined;
  track?: TitleTrack | null | undefined;
}

/**
 * Builds the code of job titles (`<unit code>-L<grade><track>-<sequence>`) inside the caller's transaction, under one lock, so two titles of the
 * same unit, grade and track never take the same sequence. The code is built once and never changes; a unit without a code gives its titles none
 * until it gets one (`fill`).
 */
@Injectable()
export class JobTitleCodesService {
  constructor(private readonly titles: JobTitleRepository) {}

  /** The codes of the given titles of a unit, in order (null for a title with no grade and track, or when the unit has no code). */
  async assign(unitCode: string | null, items: readonly GradedTitle[], tx: TransactionContext): Promise<(string | null)[]> {
    await this.titles.lockCodes(tx);
    const issued = await this.titles.issuedCodes(tx);
    return items.map((item) => {
      if (!unitCode || item.grade == null || !item.track) return null;
      const code = nextTitleCode(issued, { unitCode, grade: item.grade, track: item.track });
      issued.add(code);
      return code;
    });
  }

  /** A unit that just got its code gives a code to the titles it already had with a grade and track. */
  async fill(nodeId: string, unitCode: string, tx: TransactionContext): Promise<void> {
    const waiting = await this.titles.uncodedOfNode(nodeId, tx);
    if (!waiting.length) return;
    const codes = await this.assign(unitCode, waiting, tx);
    for (const [i, title] of waiting.entries()) if (codes[i]) await this.titles.setCode(title.id, codes[i] as string, tx);
  }
}
