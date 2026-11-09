import { setup } from 'xstate';

export const CYCLE_KEY = 'performance.cycle';
export const CYCLE_VERSION = 1;

/**
 * The evaluation cycle (FR-118): self-evaluation, manager's evaluation, calibration, approval, individual notification, objections, closed. HR moves it on
 * one stage at a time (`NEXT`) and may close it from any stage before it is closed (`CLOSE`). No timers: the stages move by a person's decision.
 */
export const cycleMachine = setup({
  types: { events: {} as { type: 'NEXT' } | { type: 'CLOSE' } },
}).createMachine({
  id: CYCLE_KEY,
  initial: 'self',
  states: {
    self: { on: { NEXT: 'mgr', CLOSE: 'closed' } },
    mgr: { on: { NEXT: 'cal', CLOSE: 'closed' } },
    cal: { on: { NEXT: 'appr', CLOSE: 'closed' } },
    appr: { on: { NEXT: 'notif', CLOSE: 'closed' } },
    notif: { on: { NEXT: 'obj', CLOSE: 'closed' } },
    obj: { on: { CLOSE: 'closed' } },
    closed: { type: 'final' },
  },
});
