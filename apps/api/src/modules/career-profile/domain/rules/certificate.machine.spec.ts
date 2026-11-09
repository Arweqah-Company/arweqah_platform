import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { certificateMachine } from './certificate.machine';

const run = (...events: ('APPROVE' | 'REJECT' | 'REFER')[]) => {
  const actor = createActor(certificateMachine).start();
  for (const type of events) actor.send({ type });
  return actor.getSnapshot().value;
};

describe('career.certificate machine (FR-114)', () => {
  it('goes from uploaded to approved, rejected or the manager, and the manager decides last', () => {
    expect(run()).toBe('uploaded');
    expect(run('APPROVE')).toBe('approved');
    expect(run('REJECT')).toBe('rejected');
    expect(run('REFER')).toBe('referred_to_manager');
    expect(run('REFER', 'APPROVE')).toBe('approved');
    expect(run('REFER', 'REJECT')).toBe('rejected');
  });

  it('cannot be referred twice and does not move after it is decided', () => {
    expect(run('REFER', 'REFER')).toBe('referred_to_manager');
    expect(run('APPROVE', 'REJECT')).toBe('approved');
    expect(run('REJECT', 'APPROVE')).toBe('rejected');
  });
});
