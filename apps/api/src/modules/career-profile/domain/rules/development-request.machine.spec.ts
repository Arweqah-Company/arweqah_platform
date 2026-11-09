import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { REQUEST_DIRECT_DAYS } from '@arweqah-platform/shared';
import { developmentRequestMachine } from './development-request.machine';

type Event = 'ROUTE_DIRECT' | 'ROUTE_SECTOR' | 'ROUTE_CEO' | 'APPROVE' | 'REJECT' | 'TIMEOUT';
const run = (...events: Event[]) => {
  const actor = createActor(developmentRequestMachine).start();
  for (const type of events) actor.send({ type });
  return actor.getSnapshot();
};

describe('career.development_request machine (FR-116)', () => {
  it('routes by level and lets that level approve or reject', () => {
    expect(run().value).toBe('submitted');
    expect(run('ROUTE_DIRECT').value).toBe('direct');
    expect(run('ROUTE_SECTOR', 'APPROVE').value).toBe('approved');
    expect(run('ROUTE_CEO', 'REJECT').value).toBe('rejected');
  });

  it('sends a request the direct manager left to the sector head, and only from the direct step', () => {
    expect(run('ROUTE_DIRECT', 'TIMEOUT').value).toBe('sector');
    expect(run('ROUTE_SECTOR', 'TIMEOUT').value).toBe('sector');
    expect(run('ROUTE_CEO', 'TIMEOUT').value).toBe('ceo');
  });

  it('does not move after it is decided', () => {
    expect(run('ROUTE_DIRECT', 'APPROVE', 'REJECT', 'TIMEOUT').value).toBe('approved');
  });

  it('carries the direct deadline in meta (a durable timeout), nowhere else', () => {
    const meta = run('ROUTE_DIRECT').getMeta() as Record<string, { timeout?: { afterMs: number; event: string } }>;
    expect(Object.values(meta)[0]?.timeout).toEqual({ afterMs: REQUEST_DIRECT_DAYS * 86_400_000, event: 'TIMEOUT' });
    expect(Object.keys(run('ROUTE_SECTOR').getMeta())).toHaveLength(0);
  });
});
