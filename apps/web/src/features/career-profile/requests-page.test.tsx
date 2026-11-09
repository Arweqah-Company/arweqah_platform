import { CorePermission, type DevelopmentRequestDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { RequestsPage } from './requests-page';

const request = (over: Partial<DevelopmentRequestDto> = {}): DevelopmentRequestDto => ({ id: 'q1', employeeId: 'e1', employeeName: 'منى الزهراني', courseName: 'إدارة المشاريع', cost: 3000, plan: 'in', status: 'pending', level: 'direct', approverName: 'فهد', canDecide: true, overBudget: false, hasAgreement: true, agreementName: 'agreement.pdf', rejectionReason: null, submittedAt: '2026-11-08T10:00:00.000Z', decidedAt: null, ...over });
const ROWS = [request(), request({ id: 'q2', employeeName: 'خالد الشمري', courseName: 'التفاوض', canDecide: false, level: 'sector', plan: 'out', cost: 9000, overBudget: true }), request({ id: 'q3', employeeName: 'ريم الغامدي', courseName: 'القيادة', status: 'approved', canDecide: false })];
const ALL = [CorePermission.CareerRequestsView, CorePermission.CareerRequestsApprove, CorePermission.CareerRequestsReject, CorePermission.CareerRequestsExport];

function open(keys: string[] = ALL) {
  window.localStorage.setItem('view:career-requests', 'table');
  const asked: URLSearchParams[] = [];
  const posted: { url: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'subtree' as const }))))),
    http.get('*/api/career/requests', ({ request: r }) => { asked.push(new URL(r.url).searchParams); return HttpResponse.json({ items: ROWS, total: 3, page: 1, pageSize: 20 }); }),
    http.post('*/api/career/requests/:id/:action', async ({ request: r }) => { posted.push({ url: new URL(r.url).pathname, body: await r.json() }); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<RequestsPage />);
  return { asked, posted };
}

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement;

describe('«Development requests» for the approvers (FR-116)', () => {
  it('lists the requests with the employee, the cost, the plan, who decides and the state, and asks the API for those waiting for the viewer first', async () => {
    const { asked } = open();
    const row = await rowOf('خالد الشمري');
    expect(within(row).getByText('التفاوض')).toBeInTheDocument();
    expect(within(row).getByText('خارج الخطة')).toBeInTheDocument();
    expect(within(row).getByText('مدير القطاع')).toBeInTheDocument();
    expect(within(row).getByText('تتجاوز الباقي من الميزانية')).toBeInTheDocument();
    expect(within(await rowOf('ريم الغامدي')).getByText('معتمد')).toBeInTheDocument();
    expect(asked[0]?.get('mine')).toBe('true');
  });

  it('switches to every request of the scope, and searches and filters in the API query', async () => {
    const { asked } = open();
    await rowOf('خالد الشمري');
    fireEvent.click(screen.getByRole('tab', { name: 'كل الطلبات' }));
    await waitFor(() => expect(asked.some((p) => !p.has('mine'))).toBe(true));
    fireEvent.change(screen.getByPlaceholderText('ابحث بالموظف أو الكورس'), { target: { value: 'تفاوض' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'تفاوض')).toBe(true));
  });

  it('opens a request on a click and approves it when it is with the viewer', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /agreement\.pdf/ })).toHaveAttribute('href', '/api/career/requests/q1/agreement');
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/requests/q1/approve', body: {} }));
  });

  it('rejects with a reason of at least five characters', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'رفض' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'رفض الطلب' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('سبب الرفض'), { target: { value: 'لا' } });
    expect(within(dialog).getByText('السبب خمسة أحرف على الأقل.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('سبب الرفض'), { target: { value: 'خارج أولويات الفريق' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/requests/q1/reject', body: { reason: 'خارج أولويات الفريق' } }));
  });

  it('shows a request that is with somebody else read only: no decision, and a note saying so', async () => {
    open();
    fireEvent.click(await screen.findByText('خالد الشمري'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/عند معتمِد آخر/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'اعتماد' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /اعتماد: التفاوض/ })).not.toBeInTheDocument();
  });

  it('shows no decision button without the approve and reject keys, and no export without its key', async () => {
    open([CorePermission.CareerRequestsView]);
    const row = await rowOf('منى الزهراني');
    expect(within(row).queryByRole('button', { name: /اعتماد/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /رفض/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
  });
});
