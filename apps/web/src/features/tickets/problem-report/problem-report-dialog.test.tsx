import { fireEvent, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ProblemReportDialog } from './problem-report-dialog';
import { CONTEXT, SHOT } from './problem-report-fixtures';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() }));


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
