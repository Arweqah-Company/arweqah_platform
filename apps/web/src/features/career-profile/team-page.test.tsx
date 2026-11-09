import { CorePermission, type TeamMemberDetailDto, type TeamMemberDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { CareerTeamPage } from './team-page';

beforeEach(() => window.localStorage.clear());

const member = (over: Partial<TeamMemberDto> = {}): TeamMemberDto => ({ employeeId: 'e1', name: 'منى الزهراني', titleNameAr: 'منسق الاستقطاب', titleNameEn: 'Coordinator', requiredDone: 1, requiredTotal: 4, approvedMinutes: 720, yearMinutes: 2400, overdue: 1, waiting: 1, status: 'late', ...over });
const MEMBERS = [member(), member({ employeeId: 'e2', name: 'خالد الشمري', requiredDone: 3, overdue: 0, status: 'regular' }), member({ employeeId: 'e3', name: 'ريم الغامدي', status: 'no_path', requiredDone: 0, requiredTotal: 0, overdue: 0 })];
const ALL = [CorePermission.CareerTeamView, CorePermission.CareerTeamDecide, CorePermission.CareerTeamExport];

function open(keys: string[] = ALL) {
  window.localStorage.setItem('view:career-team', 'table');
  const asked: URLSearchParams[] = [];
  const posted: { url: string; body: unknown }[] = [];
  const detail: TeamMemberDetailDto = { ...member(), proofs: [{ id: 'p1', unitTitle: 'أمان العمل', kind: 'application', status: 'referred', submittedAt: '2026-11-08T10:00:00.000Z', note: 'طبّقتها' }, { id: 'p2', unitTitle: 'الكتابة المهنية', kind: 'certificate', status: 'wait', submittedAt: '2026-11-08T10:00:00.000Z', note: null }] };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'subtree' as const }))))),
    http.get('*/api/career/team', ({ request }) => { asked.push(new URL(request.url).searchParams); return HttpResponse.json({ items: MEMBERS, total: 3, page: 1, pageSize: 20, lateCount: 1 }); }),
    http.get('*/api/career/team/:id', () => HttpResponse.json(detail)),
    http.post('*/api/career/team/:id/proofs/:proof/:action', async ({ request }) => { posted.push({ url: new URL(request.url).pathname, body: await request.json() }); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<CareerTeamPage />);
  return { asked, posted };
}

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement;

describe('«My career team» (FR-115)', () => {
  it('lists the team with the share of mandatory and necessary units, the hours, the late items and the state, and says how many are late', async () => {
    open();
    const row = await rowOf('منى الزهراني');
    expect(within(row).getByText('25%')).toBeInTheDocument();
    expect(within(row).getByText('منسق الاستقطاب')).toBeInTheDocument();
    expect(within(row).getByText('متأخر')).toBeInTheDocument();
    expect(within(await rowOf('خالد الشمري')).getByText('منتظم')).toBeInTheDocument();
    expect(within(await rowOf('ريم الغامدي')).getByText('بلا مسار جاهز')).toBeInTheDocument();
    expect(screen.getByText('1 من فريقك متأخر في المطلوب.')).toBeInTheDocument();
  });

  it('searches in the API query', async () => {
    const { asked } = open();
    await rowOf('منى الزهراني');
    fireEvent.change(screen.getByPlaceholderText('ابحث بالاسم'), { target: { value: 'منى' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'منى')).toBe(true));
  });

  it('opens a member on a click: three figures, the proofs waiting, and the read-only note', async () => {
    open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('أمان العمل')).toBeInTheDocument();
    expect(within(dialog).getByText('1 من 4')).toBeInTheDocument();
    expect(within(dialog).getByText(/لا تعديل على ملفه المهني/)).toBeInTheDocument();
  });

  it('lets the manager approve, or reject with a reason, only the proof referred to them', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منى الزهراني'));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('أمان العمل');
    expect(within(dialog).getAllByRole('button', { name: 'اعتماد' })).toHaveLength(1); // the waiting certificate is the reviewer's
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/team/e1/proofs/p1/approve', body: {} }));
  });

  it('shows no decision button without the decide key', async () => {
    open([CorePermission.CareerTeamView]);
    fireEvent.click(await screen.findByText('منى الزهراني'));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('أمان العمل');
    expect(within(dialog).queryByRole('button', { name: 'اعتماد' })).not.toBeInTheDocument();
  });
});
