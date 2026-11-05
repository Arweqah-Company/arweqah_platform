import { describe, expect, it, vi } from 'vitest';
import type { OrgLeadersService } from '../../application/services/org-leaders.service';
import type { OrgVersionsService } from '../../application/services/org-versions.service';
import { OrgScheduleJob } from './org-schedule.job';

describe('The nightly pass of the structure keeps going when one step fails (FR-99, FR-100; CodeRabbit, PR 52)', () => {
  it('still refreshes the leaders when the dated changes of units could not be applied', async () => {
    const versions = { applyDue: vi.fn().mockRejectedValue(new Error('versions table locked')) } as unknown as OrgVersionsService;
    const refresh = vi.fn().mockResolvedValue(2);
    const job = new OrgScheduleJob(versions, { refreshCurrentCopies: refresh } as unknown as OrgLeadersService);
    await expect(job.scheduled()).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('runs both steps when nothing fails', async () => {
    const applyDue = vi.fn().mockResolvedValue(1);
    const refresh = vi.fn().mockResolvedValue(0);
    await new OrgScheduleJob({ applyDue } as unknown as OrgVersionsService, { refreshCurrentCopies: refresh } as unknown as OrgLeadersService).scheduled();
    expect(applyDue).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
