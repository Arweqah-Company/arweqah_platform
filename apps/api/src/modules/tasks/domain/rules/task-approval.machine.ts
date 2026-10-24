import { setup } from 'xstate';

export const TASK_APPROVAL_KEY = 'task.self_approval';
export const TASK_APPROVAL_VERSION = 1;

/**
 * Approval of a task a person gave to themselves: first their direct manager, then (for a task of a project) the project manager.
 * The second step exists in the machine but is never entered until the projects module is built, because `projectApproval` is false for
 * every task today (docs/plans/phase-3-tasks.md §1.1). The machine has no timers; a task waits for its approver.
 */
export const taskApprovalMachine = setup({
  types: {
    context: {} as { projectApproval: boolean },
    input: {} as { projectApproval: boolean },
    events: {} as { type: 'APPROVE' } | { type: 'REJECT' },
  },
  guards: { needsProjectApproval: ({ context }) => context.projectApproval },
}).createMachine({
  id: TASK_APPROVAL_KEY,
  context: ({ input }) => ({ projectApproval: input.projectApproval }),
  initial: 'pendingManager',
  states: {
    pendingManager: { on: { APPROVE: [{ guard: 'needsProjectApproval', target: 'pendingProject' }, { target: 'approved' }], REJECT: 'rejected' } },
    pendingProject: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    approved: { type: 'final' },
    rejected: { type: 'final' },
  },
});
