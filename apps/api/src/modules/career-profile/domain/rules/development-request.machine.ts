import { setup } from 'xstate';
import { REQUEST_DIRECT_DAYS } from '@arweqah-platform/shared';

export const DEV_REQUEST_KEY = 'career.development_request';
export const DEV_REQUEST_VERSION = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A development request (FR-116): sent, then routed to the level its cost asks for. The direct manager has seven calendar days (about five working
 * days): then it goes up to the sector head (a durable timeout, never an XState `after`). The sector head and the CEO have no deadline.
 */
export const developmentRequestMachine = setup({
  types: { events: {} as { type: 'ROUTE_DIRECT' } | { type: 'ROUTE_SECTOR' } | { type: 'ROUTE_CEO' } | { type: 'APPROVE' } | { type: 'REJECT' } | { type: 'TIMEOUT' } },
}).createMachine({
  id: DEV_REQUEST_KEY,
  initial: 'submitted',
  states: {
    submitted: { on: { ROUTE_DIRECT: 'direct', ROUTE_SECTOR: 'sector', ROUTE_CEO: 'ceo' } },
    direct: {
      meta: { timeout: { afterMs: REQUEST_DIRECT_DAYS * DAY_MS, event: 'TIMEOUT' } },
      on: { APPROVE: 'approved', REJECT: 'rejected', TIMEOUT: 'sector' },
    },
    sector: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    ceo: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    approved: { type: 'final' },
    rejected: { type: 'final' },
  },
});
