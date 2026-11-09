import { CorePermission, type CertificateReviewItemDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { CertificatesPage } from './certificates-page';

beforeEach(() => window.localStorage.clear());

const ALL = [CorePermission.CareerCertificatesReview, CorePermission.CareerCertificatesApprove, CorePermission.CareerCertificatesReject, CorePermission.CareerCertificatesRefer, CorePermission.CareerCertificatesExport];
const item = (over: Partial<CertificateReviewItemDto> = {}): CertificateReviewItemDto => ({ id: 'p1', employeeId: 'e1', employeeName: 'منى الزهراني', unitNameAr: 'وحدة الاستقطاب', unitNameEn: 'Recruitment unit', unitTitle: 'أمان العمل', kind: 'certificate', status: 'wait', minutes: 120, note: 'شهادة الدورة', fileName: 'cert.pdf', hasFile: true, submittedAt: '2026-11-08T10:00:00.000Z', rejectionCount: 0, ...over });

function open(keys: string[] = ALL, items: CertificateReviewItemDto[] = [item(), item({ id: 'p2', employeeName: 'خالد الشمري', kind: 'application', status: 'referred' }), item({ id: 'p3', employeeName: 'ريم الغامدي', status: 'done' })]) {
  window.localStorage.setItem('view:career-certificates', 'table');
  const asked: URLSearchParams[] = [];
  const posted: { url: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/career/certificates', ({ request }) => { asked.push(new URL(request.url).searchParams); return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 }); }),
    http.post('*/api/career/certificates/:id/:action', async ({ request }) => { posted.push({ url: new URL(request.url).pathname, body: await request.json() }); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<CertificatesPage />);
  return { asked, posted };
}

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement;

describe('The certificate review page (FR-114)', () => {
  it('lists the proofs with the employee, the unit, the kind, the hours and the state', async () => {
    open();
    const row = await rowOf('منى الزهراني');
    expect(within(row).getByText('وحدة الاستقطاب')).toBeInTheDocument();
    expect(within(row).getByText('شهادة')).toBeInTheDocument();
    expect(within(row).getByText('بانتظار الاعتماد')).toBeInTheDocument();
    expect(within(await rowOf('خالد الشمري')).getByText('عند المدير المباشر')).toBeInTheDocument();
  });

  it('searches and filters in the API query: the kind and the state', async () => {
    const { asked } = open();
    await rowOf('منى الزهراني');
    fireEvent.change(screen.getByPlaceholderText('ابحث بالموظف أو الوحدة'), { target: { value: 'منى' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'منى')).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    await chooseOption(await screen.findByLabelText('نوع الإثبات'), 'application');
    await waitFor(() => expect(asked.some((p) => p.get('kind') === 'application')).toBe(true));
  });

  it('shows the decisions only on a proof that waits, and only for the keys held, even when the permissions arrive after the rows', async () => {
    open();
    server.use(http.get('*/api/me/access', async () => { await delay(300); return HttpResponse.json(access(ALL.map((key) => ({ key, scope: 'all' as const })))); }));
    const waiting = await rowOf('منى الزهراني');
    for (const name of [/اعتماد: /, /رفض بسبب: /, /إحالة إلى المدير المباشر: /]) expect(await within(waiting).findByRole('button', { name })).toBeInTheDocument(); // the keys may arrive after the rows
    const referred = await rowOf('خالد الشمري');
    expect(within(referred).queryByRole('button', { name: /إحالة إلى المدير المباشر: / })).not.toBeInTheDocument(); // already with the manager
    const done = await rowOf('ريم الغامدي');
    expect(within(done).queryByRole('button', { name: /اعتماد: / })).not.toBeInTheDocument();
  });

  it('hides every decision from a person who only reviews', async () => {
    open([CorePermission.CareerCertificatesReview]);
    const row = await rowOf('منى الزهراني');
    expect(within(row).queryByRole('button', { name: /اعتماد: |رفض بسبب: |إحالة/ })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /فتح الإثبات: / })).toBeInTheDocument();
  });

  it('opens the review window on a click on the row and approves from it', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('أمان العمل')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /cert\.pdf/ })).toHaveAttribute('href', '/api/career/certificates/p1/file');
    fireEvent.click(await within(dialog).findByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/certificates/p1/approve', body: {} }));
  });

  it('asks for a reason of five characters before rejecting, and sends it', async () => {
    const { posted } = open();
    fireEvent.click(await within(await rowOf('منى الزهراني')).findByRole('button', { name: /رفض بسبب: / }));
    const confirm = await screen.findByRole('button', { name: 'رفض الإثبات' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('سبب الرفض *'), { target: { value: 'لا' } });
    expect(screen.getByText('اكتب سببًا من 5 أحرف على الأقل.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('سبب الرفض *'), { target: { value: 'الشهادة لا تحمل اسمك' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/certificates/p1/reject', body: { reason: 'الشهادة لا تحمل اسمك' } }));
  });

  it('refers a proof to the direct manager from its window', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    fireEvent.click(await within(await screen.findByRole('dialog')).findByRole('button', { name: 'إحالة إلى المدير المباشر' }));
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/certificates/p1/refer', body: {} }));
  });
});
