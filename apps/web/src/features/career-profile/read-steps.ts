import { CAREER_SECTION_KEYS, type CareerSectionKey } from './sections';

/**
 * Reading the career path in order before acknowledging it (P19): five sections, then the acknowledgement as a sixth step. Section `j` is open
 * while `j <= reached` (the number of sections read); the acknowledgement is open when all five were read.
 */
export type ReadStep = CareerSectionKey | 'ack';
export const READ_STEPS: readonly ReadStep[] = [...CAREER_SECTION_KEYS, 'ack'];

export const stepIndex = (step: ReadStep): number => READ_STEPS.indexOf(step);
export const isOpen = (step: ReadStep, reached: number): boolean => stepIndex(step) <= reached;
export const isRead = (step: ReadStep, reached: number): boolean => stepIndex(step) < reached;
export const nextOf = (step: ReadStep): ReadStep | null => READ_STEPS[stepIndex(step) + 1] ?? null;
export const previousOf = (step: ReadStep): ReadStep | null => READ_STEPS[stepIndex(step) - 1] ?? null;

/** «Next» works once the section was scrolled to its end, or it was read before. */
export const canGoNext = (step: ReadStep, reached: number, scrolledToEnd: boolean): boolean => step !== 'ack' && (isRead(step, reached) || scrolledToEnd);

/** The sections read after pressing «Next» on `step`. */
export const reachedAfter = (step: ReadStep, reached: number): number => Math.max(reached, stepIndex(step) + 1);

/** The acknowledgement box is enabled only on the last step, after the five sections were read. */
export const canAcknowledge = (step: ReadStep, reached: number): boolean => step === 'ack' && reached >= CAREER_SECTION_KEYS.length;

