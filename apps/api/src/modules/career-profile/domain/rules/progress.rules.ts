import type { CareerContent, MyProgressDto } from '@arweqah-platform/shared';

type Counts = Pick<MyProgressDto, 'approvedMinutes' | 'badges' | 'nextBadge'>;

/** Which medals the approved hours reach (a medal asks for whole hours) and the next one with what is still missing. */
export function badgeProgress(content: CareerContent, approvedMinutes: number): Counts {
  const badges = [...content.learning.badges]
    .sort((a, b) => a.hours - b.hours)
    .map((b) => ({ name: b.name, hours: b.hours, reached: approvedMinutes >= b.hours * 60 }));
  const next = badges.find((b) => !b.reached);
  return { approvedMinutes, badges, nextBadge: next ? { name: next.name, hours: next.hours, missingMinutes: next.hours * 60 - approvedMinutes } : null };
}

/** How many units the plan has. */
export const unitCount = (content: CareerContent): number => content.learning.periods.reduce((n, p) => n + p.units.length, 0);

/** The item indexes of «required» that exist in the content (a tick of an index the content no longer has is dropped when read). */
export const validRequiredIndexes = (content: CareerContent, ticked: readonly number[]): number[] => ticked.filter((i) => i >= 0 && i < content.required.length).sort((a, b) => a - b);
