import type { CareerContent, TeamMemberDto } from '@arweqah-platform/shared';
import { LEARNING_PRIORITIES } from '@arweqah-platform/shared';

type Numbers = Pick<TeamMemberDto, 'requiredDone' | 'requiredTotal' | 'approvedMinutes' | 'overdue' | 'waiting' | 'status'>;

interface Inputs {
  content: CareerContent;
  records: readonly { unitId: string; status: string; minutes: number }[];
  ticked: readonly number[];
  /** The day, as `YYYY-MM-DD`. */
  today: string;
}

const COUNTED = new Set<string>([LEARNING_PRIORITIES[0], LEARNING_PRIORITIES[1]]);

/** The numbers of one team member: how much of the mandatory and necessary units is approved, the approved minutes, the dated items still open past their date, and the state. */
export function teamNumbers({ content, records, ticked, today }: Inputs): Numbers {
  const done = new Set(records.filter((r) => r.status === 'done').map((r) => r.unitId));
  const counted = content.learning.periods.flatMap((p) => p.units).filter((u) => COUNTED.has(u.priority));
  const overdue = content.required.filter((item, i) => item.deadline !== null && item.deadline < today && !ticked.includes(i)).length;
  return {
    requiredTotal: counted.length,
    requiredDone: counted.filter((u) => u.id && done.has(u.id)).length,
    approvedMinutes: records.filter((r) => r.status === 'done').reduce((sum, r) => sum + r.minutes, 0),
    overdue,
    waiting: records.filter((r) => r.status === 'wait' || r.status === 'referred').length,
    status: overdue > 0 ? 'late' : 'regular',
  };
}
