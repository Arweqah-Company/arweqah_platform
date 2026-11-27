import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ProblemReportDialog } from './problem-report-dialog';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() }));

const CONTEXT = { pageTitle: 'التذاكر', path: '/tickets', language: 'ar' as const, theme: 'light' as const, viewport: '1280x720', browser: 'Chrome', appVersion: '', failedRequests: [], errors: [] };
const SHOT = () => new Blob(['x'], { type: 'image/jpeg' });

describe('the AI button (FR-197)', () => {
  const READ = { title: 'قائمة التذاكر لا تُحمَّل', description: 'القائمة فارغة ويظهر خطأ 500.\n\nخطوات محتملة:\n1. افتح التذاكر', imageSeen: true };
  function serveAi(calls: string[], bodies: Record<string, unknown[]>) {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.post('*/api/files', () => { calls.push('files'); return HttpResponse.json({ id: 'f1', originalName: 'screenshot.jpg', contentType: 'image/jpeg', size: 1 }); }),
      http.post('*/api/problem-reports/analyze', async ({ request }) => { calls.push('analyze'); (bodies.analyze ??= []).push(await request.json()); return HttpResponse.json(READ); }),
      http.post('*/api/problem-reports', async ({ request }) => { calls.push('report'); (bodies.report ??= []).push(await request.json()); return HttpResponse.json({ ticketId: 't1', ticketNumber: 26 }, { status: 201 }); }),
    );
  }

  it('has no button unless the analysis is on', async () => {
    serveAi([], {});
    renderPage(<ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi={false} canAnalyze={false} onClose={() => undefined} />);
    await screen.findByRole('textbox', { name: /ما المشكلة/ });
    expect(screen.queryByRole('button', { name: 'حلّل بالذكاء الاصطناعي' })).not.toBeInTheDocument();
  });

  it('writes the title and the description into the fields, lets the person change them, and sends the changed text with the same screenshot (uploaded once)', async () => {
    const calls: string[] = [];
    const bodies: Record<string, unknown[]> = {};
    serveAi(calls, bodies);
    const closed = vi.fn();
    renderPage(<ProblemReportDialog screenshot={SHOT()} context={CONTEXT} imageToAi canAnalyze onClose={closed} />);
    const note = await screen.findByRole('textbox', { name: /ما المشكلة/ });
    fireEvent.change(note, { target: { value: 'القائمة فارغة' } });
    fireEvent.click(screen.getByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    await vi.waitFor(() => expect(note).toHaveValue(READ.description));
    expect(screen.getByRole('textbox', { name: /عنوان البلاغ/ })).toHaveValue(READ.title);
    expect(screen.getByText(/كتب الذكاء الاصطناعي العنوان والوصف أعلاه/)).toBeInTheDocument();
    fireEvent.change(note, { target: { value: `${READ.description}\nوأضفت سطرًا` } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال البلاغ' }));
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(calls).toEqual(['files', 'analyze', 'report']);
    expect(bodies.analyze![0]).toEqual({ note: 'القائمة فارغة', fileId: 'f1', context: CONTEXT });
    expect(bodies.report![0]).toEqual({ title: READ.title, note: `${READ.description}\nوأضفت سطرًا`, fileId: 'f1', context: CONTEXT, analyzed: true });
  });

  it('says when the AI did not see the screenshot, and leaves the fields as they were when the analysis fails', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.post('*/api/problem-reports/analyze', () => HttpResponse.json({ statusCode: 422, code: 'PROBLEM_REPORT_ANALYSIS_FAILED', message: 'x' }, { status: 422 })),
    );
    renderPage(<ProblemReportDialog screenshot={null} context={CONTEXT} imageToAi={false} canAnalyze onClose={() => undefined} />);
    const note = await screen.findByRole('textbox', { name: /ما المشكلة/ });
    fireEvent.change(note, { target: { value: 'كتبتها بيدي' } });
    expect(screen.getByText(/ملاحظتك ومعلومات الصفحة فقط/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(note).toHaveValue('كتبتها بيدي');
  });
});
