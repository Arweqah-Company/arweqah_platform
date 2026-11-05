import { describe, expect, it, vi } from 'vitest';
import { OrgLeadersService } from './org-leaders.service';

/** Only `refreshCurrentCopies` is exercised, with the collaborators it reads stubbed on a bare object. */
function harness(failingNode: string) {
  const refreshed: string[] = [];
  const self = {
    leaders: { nodesWithRows: vi.fn().mockResolvedValue(['a', 'bad', 'c']) },
    repo: { node: vi.fn(async (id: string) => ({ id })) },
    tx: { run: vi.fn(async (work: (tx: unknown) => Promise<boolean>) => work({})) },
    refreshCopy: vi.fn(async (node: { id: string }) => {
      if (node.id === failingNode) throw new Error('bad data in this unit');
      refreshed.push(node.id);
      return true;
    }),
    syncHeadRoles: vi.fn(async () => undefined),
    logger: { error: vi.fn() },
  };
  return { self, refreshed };
}

describe('The leaders of every unit are refreshed even when one unit fails (FR-100; CodeRabbit, PR 52)', () => {
  it('goes on to the units after a failing one and counts only the ones that changed', async () => {
    const { self, refreshed } = harness('bad');
    const changed = await OrgLeadersService.prototype.refreshCurrentCopies.call(self as unknown as OrgLeadersService);
    expect(refreshed).toEqual(['a', 'c']);
    expect(changed).toBe(2);
  });
});
