import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import * as capture from './capture-screenshot';
import { Dialog, DialogToolsProvider } from '@/shared/ui';
import { ProblemReportButton } from './problem-report-button';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() }));
beforeEach(() => {
  vi.spyOn(capture, 'captureScreenshot').mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
});

function serve(keys: string[], available: boolean, without: string[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const })), { without }))),
    http.get('*/api/problem-reports/availability', () => HttpResponse.json({ available, imageToAi: false })),
  );
}

describe('The «report a problem» button (FR-196, FR-198)', () => {
  it('shows for a person with the key while reports are on, and opens the report with the screenshot', async () => {
    serve([CorePermission.TicketsReportProblem], true);
    renderPage(<ProblemReportButton />);
    fireEvent.click(await screen.findByRole('button', { name: 'بلّغ عن مشكلة' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'عرض اللقطة بالحجم الكامل' })).toBeInTheDocument();
  });

  it('is not there while the administrator has it off', async () => {
    serve([CorePermission.TicketsReportProblem], false);
    renderPage(<ProblemReportButton />);
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'بلّغ عن مشكلة' })).not.toBeInTheDocument());
  });

  it('is not there for a person without the key, and asks nothing', async () => {
    let asked = false;
    serve([], true, [CorePermission.TicketsReportProblem]); // the Employee role holds the key by default
    server.use(http.get('*/api/problem-reports/availability', () => { asked = true; return HttpResponse.json({ available: true, imageToAi: false }); }));
    renderPage(<ProblemReportButton />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('button', { name: 'بلّغ عن مشكلة' })).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });

  it('is reachable from inside a pop-up window, which covers the top bar, and the report itself carries no second button', async () => {
    serve([CorePermission.TicketsReportProblem], true);
    renderPage(
      <DialogToolsProvider value={<ProblemReportButton inDialog />}>
        <Dialog open onOpenChange={() => undefined} title="نافذة فيها مشكلة"><p>محتوى</p></Dialog>
      </DialogToolsProvider>,
    );
    const host = await screen.findByRole('dialog', { name: 'نافذة فيها مشكلة' });
    fireEvent.click(await within(host).findByRole('button', { name: 'بلّغ عن مشكلة' }));
    const report = await screen.findByRole('dialog', { name: 'بلّغ عن مشكلة' });
    expect(within(report).queryByRole('button', { name: 'بلّغ عن مشكلة' })).not.toBeInTheDocument();
  });
});
