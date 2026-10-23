import { addWorkingDays } from '@arweqah-platform/shared';

/** What the sender may pick as "needed by": today plus at least the desk's minimum lead (in working days). */
export function earliestNeededBy(today: string, minLeadDays: number): string {
  return addWorkingDays(today, minLeadDays);
}

/** The suggested date: today plus the type's usual duration (or the desk's) in working days. */
export function suggestedNeededBy(today: string, typeDueDays: number | null, deskDueDays: number): string {
  return addWorkingDays(today, typeDueDays ?? deskDueDays);
}

/** The date to store: the one the sender chose (if it is not too early), else the suggestion. Null when the chosen one is too early. */
export function resolveNeededBy(input: { chosen: string | undefined; today: string; typeDueDays: number | null; deskDueDays: number; minLeadDays: number }): string | null {
  const { chosen, today, typeDueDays, deskDueDays, minLeadDays } = input;
  if (!chosen) return suggestedNeededBy(today, typeDueDays, deskDueDays);
  return chosen >= earliestNeededBy(today, minLeadDays) ? chosen : null;
}
