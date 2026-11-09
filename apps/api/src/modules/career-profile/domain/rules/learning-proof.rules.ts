import type { CareerContent, ProofKind, RecordStatus, SubmitProofInput } from '@arweqah-platform/shared';

/** A unit of the learning plan with the name of the period it sits in. */
export interface FoundUnit {
  id: string;
  title: string;
  minutes: number;
  period: string;
}

/** The unit of a title's learning plan with this id; null when the plan has no such unit (it was removed or never existed). */
export function findUnit(content: CareerContent, unitId: string): FoundUnit | null {
  for (const period of content.learning.periods) {
    const unit = period.units.find((u) => u.id === unitId);
    if (unit) return { id: unitId, title: unit.title, minutes: unit.minutes, period: period.name };
  }
  return null;
}

/** Why a proof cannot be sent, or null: a certificate goes with its file; a record that is waiting or approved is not replaced. */
export function proofProblem(input: Pick<SubmitProofInput, 'kind' | 'fileId'>, existing: RecordStatus | null): 'file_required' | 'already_sent' | 'already_done' | null {
  if (existing === 'wait' || existing === 'referred') return 'already_sent';
  if (existing === 'done') return 'already_done';
  if (input.kind === 'certificate' && !input.fileId) return 'file_required';
  return null;
}

/** The state a new proof starts in: a work application goes to the direct manager first, the others to the reviewer. */
export const startState = (kind: ProofKind): 'wait' | 'referred' => (kind === 'application' ? 'referred' : 'wait');

/** The hours (in minutes) the approved records add up to. */
export const approvedMinutes = (records: readonly { status: string; minutes: number }[]): number => records.filter((r) => r.status === 'done').reduce((sum, r) => sum + r.minutes, 0);
