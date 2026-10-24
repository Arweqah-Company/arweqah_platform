import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { taskApprovalMachine } from './task-approval.machine';

const run = (projectApproval: boolean, ...events: ('APPROVE' | 'REJECT')[]) => {
  const actor = createActor(taskApprovalMachine, { input: { projectApproval } });
  actor.start();
  for (const type of events) actor.send({ type });
  return actor.getSnapshot();
};

describe('Task self-approval machine (FR-51)', () => {
  it('is approved by the direct manager alone while no project is involved', () => {
    expect(run(false).value).toBe('pendingManager');
    const done = run(false, 'APPROVE');
    expect(done.value).toBe('approved');
    expect(done.status).toBe('done');
  });

  it('can be rejected by the manager', () => {
    expect(run(false, 'REJECT').value).toBe('rejected');
  });

  it('asks the project manager second for a task of a project (ready for the projects module)', () => {
    expect(run(true, 'APPROVE').value).toBe('pendingProject');
    expect(run(true, 'APPROVE', 'APPROVE').value).toBe('approved');
    expect(run(true, 'APPROVE', 'REJECT').value).toBe('rejected');
  });

  it('ignores further events once decided', () => {
    expect(run(false, 'REJECT', 'APPROVE').value).toBe('rejected');
  });
});
