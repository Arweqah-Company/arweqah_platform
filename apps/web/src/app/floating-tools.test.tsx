import { CorePermission as P } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../test/msw';
import { renderPage, renderRoute } from '../../test/render';
import * as capture from '@/features/tickets/problem-report/capture-screenshot';
import { Dialog, DialogToolsProvider } from '@/shared/ui';
import { AppLayout } from './app-layout';
import { DialogCornerTools, FloatingTools } from './floating-tools';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() }));
beforeEach(() => {
  vi.spyOn(capture, 'captureScreenshot').mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
});

const REPORT = { name: 'بلّغ عن مشكلة' };
const ASSISTANT = { name: 'فتح مساعد المنصة' };

/** `without`: keys the Employee role holds by default that this person lacks. */
function serve(without: string[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([], { without }))),
    http.get('*/api/problem-reports/availability', () => HttpResponse.json({ available: true, canAnalyze: false, imageToAi: false })),
  );
}

describe('The corner tools: «Report a problem» and the assistant (FR-226)', () => {
  it('puts the two buttons in one corner, the report first and the assistant at the end', async () => {
    serve();
    renderPage(<FloatingTools />);
    const corner = await screen.findByTestId('floating-tools');
    const report = await within(corner).findByRole('button', REPORT);
    const assistant = await within(corner).findByRole('button', ASSISTANT);
    expect(report.compareDocumentPosition(assistant) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(corner).toHaveClass('fixed', 'bottom-4', 'end-4');
  });

  it('leaves the assistant alone in the corner for a person who may not report, and the report alone when there is no assistant', async () => {
    serve([P.TicketsReportProblem]);
    const first = renderPage(<FloatingTools />);
    expect(await screen.findByRole('button', ASSISTANT)).toBeInTheDocument();
    expect(screen.queryByRole('button', REPORT)).not.toBeInTheDocument();
    first.unmount();
    serve([P.AgentView]);
    renderPage(<FloatingTools />);
    expect(await screen.findByRole('button', REPORT)).toBeInTheDocument();
    expect(screen.queryByRole('button', ASSISTANT)).not.toBeInTheDocument();
  });

  it('is no longer in the header: the shell has the button once, in the corner', async () => {
    serve();
    renderRoute([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>home</p> }] }]);
    const corner = await screen.findByTestId('floating-tools');
    await within(corner).findByRole('button', REPORT);
    expect(within(screen.getByRole('banner')).queryByRole('button', REPORT)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', REPORT)).toHaveLength(1);
  });

  it('shows the button in the same corner inside a pop-up window, and pressing it opens the report without closing the window', async () => {
    serve();
    const onOpenChange = vi.fn();
    renderPage(
      <DialogToolsProvider value={<DialogCornerTools />}>
        <Dialog open onOpenChange={onOpenChange} title="نافذة"><p>محتوى</p></Dialog>
      </DialogToolsProvider>,
    );
    const host = await screen.findByRole('dialog', { name: 'نافذة' });
    const corner = await within(host).findByTestId('dialog-corner-tools');
    expect(corner).toHaveClass('fixed', 'bottom-4', 'end-4');
    fireEvent.click(await within(corner).findByRole('button', REPORT));
    expect(await screen.findByRole('dialog', { name: 'بلّغ عن مشكلة' })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(host).toBeInTheDocument(); // still open (hidden from the accessibility tree only while the report is on top of it)
  });

  it('leaves room for the assistant beside it in a pop-up only while the assistant is on the screen', async () => {
    serve();
    const first = renderPage(<DialogToolsProvider value={<DialogCornerTools />}><Dialog open onOpenChange={() => undefined} title="نافذة"><p>x</p></Dialog></DialogToolsProvider>);
    const withAssistant = await screen.findByRole('button', REPORT);
    await waitFor(() => expect(withAssistant.parentElement).toHaveClass('me-14'));
    first.unmount();
    serve([P.AgentView]);
    renderPage(<DialogToolsProvider value={<DialogCornerTools />}><Dialog open onOpenChange={() => undefined} title="نافذة"><p>x</p></Dialog></DialogToolsProvider>);
    const alone = await screen.findByRole('button', REPORT);
    expect(alone.parentElement).not.toHaveClass('me-14');
  });

  it('keeps the corner buttons out of the screenshot', () => {
    serve();
    renderPage(<FloatingTools />);
    return screen.findByRole('button', REPORT).then((button) => expect(capture.isPrivate(button)).toBe(true));
  });
});
