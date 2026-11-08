import { describe, expect, it } from 'vitest';
import { canAcknowledge, canGoNext, isOpen, isRead, nextOf, previousOf, reachedAfter, READ_STEPS } from './read-steps';

describe('reading the career path in order (FR-112, decision 245)', () => {
  it('has the five sections and then the acknowledgement', () => {
    expect(READ_STEPS).toEqual(['description', 'evaluation', 'development', 'learning', 'required', 'ack']);
    expect(nextOf('required')).toBe('ack');
    expect(nextOf('ack')).toBeNull();
    expect(previousOf('description')).toBeNull();
    expect(previousOf('ack')).toBe('required');
  });

  it('opens a step only when the ones before it were read', () => {
    expect(isOpen('description', 0)).toBe(true);
    expect(isOpen('evaluation', 0)).toBe(false);
    expect(isOpen('evaluation', 1)).toBe(true);
    expect(isOpen('ack', 4)).toBe(false);
    expect(isOpen('ack', 5)).toBe(true);
    expect(isRead('description', 1)).toBe(true);
    expect(isRead('evaluation', 1)).toBe(false);
  });

  it('allows «Next» after the end of the section was reached, or when the section was read before, never on the last step', () => {
    expect(canGoNext('description', 0, false)).toBe(false);
    expect(canGoNext('description', 0, true)).toBe(true);
    expect(canGoNext('description', 1, false)).toBe(true);
    expect(canGoNext('ack', 5, true)).toBe(false);
  });

  it('counts the sections read after «Next», never going back', () => {
    expect(reachedAfter('description', 0)).toBe(1);
    expect(reachedAfter('description', 3)).toBe(3);
    expect(reachedAfter('required', 4)).toBe(5);
  });

  it('enables the acknowledgement only on the last step after all five were read', () => {
    expect(canAcknowledge('ack', 5)).toBe(true);
    expect(canAcknowledge('ack', 4)).toBe(false);
    expect(canAcknowledge('required', 5)).toBe(false);
  });
});
