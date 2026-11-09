import { setup } from 'xstate';

export const CERTIFICATE_KEY = 'career.certificate';
export const CERTIFICATE_VERSION = 1;

/**
 * The review of a proof of a learning unit (FR-114): sent, then approved, rejected, or referred to the employee's direct manager, who approves
 * or rejects it in turn. A rejected proof is replaced by a new one, which starts a new run. The machine has no timers.
 */
export const certificateMachine = setup({
  types: { events: {} as { type: 'APPROVE' } | { type: 'REJECT' } | { type: 'REFER' } },
}).createMachine({
  id: CERTIFICATE_KEY,
  initial: 'uploaded',
  states: {
    uploaded: { on: { APPROVE: 'approved', REJECT: 'rejected', REFER: 'referred_to_manager' } },
    referred_to_manager: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    approved: { type: 'final' },
    rejected: { type: 'final' },
  },
});
