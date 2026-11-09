import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { cycleMachine } from './cycle.machine';

const run = (...events: ('NEXT' | 'CLOSE')[]) => {
  const actor = createActor(cycleMachine).start();
  for (const type of events) actor.send({ type });
  return actor.getSnapshot().value;
};

describe('performance.cycle machine (FR-118)', () => {
  it('goes through the stages one at a time and ends at the objections', () => {
    expect(run()).toBe('self');
    expect(run('NEXT')).toBe('mgr');
    expect(run('NEXT', 'NEXT', 'NEXT', 'NEXT', 'NEXT')).toBe('obj');
    expect(run('NEXT', 'NEXT', 'NEXT', 'NEXT', 'NEXT', 'NEXT')).toBe('obj');
  });

  it('closes from any stage, and a closed cycle does not move', () => {
    expect(run('CLOSE')).toBe('closed');
    expect(run('NEXT', 'NEXT', 'CLOSE')).toBe('closed');
    expect(run('CLOSE', 'NEXT')).toBe('closed');
  });
});
