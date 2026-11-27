import { fireEvent, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ProblemReportDialog } from './problem-report-dialog';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() }));

const CONTEXT = { pageTitle: 'التذاكر', path: '/tickets', language: 'ar' as const, theme: 'light' as const, viewport: '1280x720', browser: 'Chrome', appVersion: '', failedRequests: [], errors: [] };
const SHOT = () => new Blob(['x'], { type: 'image/jpeg' });

function serve(calls: string[], bodies: unknown[]) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.post('*/api/files', () => { calls.push('files'); return HttpResponse.json({ id: 'f1', originalName: 'screenshot.jpg', contentType: 'image/jpeg', size: 1 }); }),
    http.post('*/api/problem-reports', async ({ request }) => { calls.push('report'); bodies.push(await request.json()); return HttpResponse.json({ ticketId: 't1', ticketNumber: 26 }, { status: 201 }); }),
  );
}

describe('The problem report (FR-196)', () => {
  it('stores the screenshot, then sends the report naming it, with the note and the context', async () => {
    const calls: string[] = [];
    const bodies: unknown[] = [];
    serve(calls, bodies);
    const closed = vi.fn();
    renderPage(<ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi={false} canAnalyze={false} onClose={closed} />);
    fireEvent.change(await screen.findByRole('textbox', { name: /ما المشكلة/ }), { target: { value: 'القائمة فارغة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال البلاغ' }));
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(calls).toEqual(['files', 'report']);
    expect(bodies[0]).toEqual({ title: '', note: 'القائمة فارغة', fileId: 'f1', context: CONTEXT, analyzed: false });
  });

  it('sends the text alone when the person unticks the screenshot (nothing is uploaded)', async () => {
    const calls: string[] = [];
    const bodies: unknown[] = [];
    serve(calls, bodies);
    const closed = vi.fn();
    renderPage(<ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi={false} canAnalyze={false} onClose={closed} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /إرفاق لقطة الشاشة/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال البلاغ' }));
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(calls).toEqual(['report']);
    expect((bodies[0] as { fileId?: string }).fileId).toBeUndefined();
  });

  it('warns that the AI will see the screenshot only when the administrator allowed it and the picture is kept', async () => {
    serve([], []);
    renderPage(<ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi canAnalyze={false} onClose={() => undefined} />);
    expect(await screen.findByText(/الذكاء الاصطناعي \(خدمة خارج المنصة\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /إرفاق لقطة الشاشة/ }));
    expect(screen.queryByText(/الذكاء الاصطناعي \(خدمة خارج المنصة\)/)).not.toBeInTheDocument();
  });

  it('says so and still sends when no screenshot could be taken; shows the server\'s refusal', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.post('*/api/problem-reports', () => HttpResponse.json({ statusCode: 422, code: 'PROBLEM_REPORT_RATE_LIMITED', message: 'Too many' }, { status: 422 })),
    );
    renderPage(<ProblemReportDialog screenshot={null} context={CONTEXT} imageToAi={false} canAnalyze={false} onClose={() => undefined} />);
    expect(await screen.findByText(/تعذّر أخذ لقطة/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال البلاغ' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('keeps the screenshot\'s address alive in development, where React runs every effect twice (the picture must not be revoked while it is shown)', async () => {
    const revoked: string[] = [];
    let made = 0;
    URL.createObjectURL = () => `blob:shot-${(made += 1)}`;
    URL.revokeObjectURL = (url: string) => { revoked.push(url); };
    serve([], []);
    renderPage(<StrictMode><ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi={false} canAnalyze={false} onClose={() => undefined} /></StrictMode>);
    const picture = await screen.findByRole('img', { hidden: true, name: 'لقطة الشاشة' }).catch(() => document.querySelector('img[alt="لقطة الشاشة"]'));
    expect(picture).not.toBeNull();
    const shown = (picture as HTMLImageElement).getAttribute('src') ?? '';
    expect(shown).toMatch(/^blob:shot-/);
    expect(revoked).not.toContain(shown);
  });
});
