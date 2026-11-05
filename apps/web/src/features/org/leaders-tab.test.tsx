import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { GROUP_COMPANY, leaderRow, leadersDto, N } from '../../../test/org-fixtures';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

const serve = (dto: ReturnType<typeof leadersDto>) => http.get('*/api/org/nodes/:id/leaders', () => HttpResponse.json(dto));

/** Opens the leaders tab of a unit of the sample structure. */
async function openLeaders(name: string) {
  fireEvent.click(await screen.findByRole('button', { name }));
  const details = await screen.findByRole('complementary', { name: `تفاصيل الوحدة: ${name}` });
  fireEvent.click(within(details).getByRole('tab', { name: 'القادة' }));
  return details;
}

const perCompany = () => {
  const leader = leaderRow({ nodeId: N.legacy, employeeName: 'منى الحربي' });
  return leadersDto({
    nodeId: N.legacy,
    effectiveMode: 'per_company',
    items: [leader],
    companies: [
      { companyId: GROUP_COMPANY, nameAr: 'أروقة الريادة', nameEn: 'Arweqah', staffCount: 3, leader, acting: null, escalatesTo: null },
      { companyId: 'c2', nameAr: 'لدن', nameEn: 'Ladun', staffCount: 4, leader: null, acting: null, escalatesTo: { nodeId: N.sector, nodeNameAr: 'قطاع التشغيل', nodeNameEn: 'Operations', employeeId: 'e9', employeeName: 'ناصر القحطاني' } },
      { companyId: 'c3', nameAr: 'نماء', nameEn: 'Namaa', staffCount: 2, leader: null, acting: null, escalatesTo: null },
    ],
  });
};

describe('The leaders tab of a unit (FR-100)', () => {
  it('shows one leader from the group company for a shared unit, with the note that the role is not tied to a company', async () => {
    openOrgPage({ handlers: [serve(leadersDto())] });
    const details = await openLeaders('قسم الموارد البشرية');
    expect(await within(details).findByText('خالد العتيبي')).toBeInTheDocument();
    expect(within(details).getByText(/دور «قائد قسم الموارد البشرية» واحد، غير مربوط بشركة/)).toBeInTheDocument();
    expect(within(details).getByText(/قائد واحد فقط من شركة المجموعة/)).toBeInTheDocument();
    expect(within(details).queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a table of company, leader and employees for a unit managed per company, with «no leader» and where the manager goes up to', async () => {
    openOrgPage({ handlers: [serve(perCompany())] });
    const details = await openLeaders('وحدة قديمة');
    const table = await within(details).findByRole('table', { name: 'قادة الوحدة حسب الشركة' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4); // header and three companies
    expect(within(rows[1] as HTMLElement).getByText('منى الحربي')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('بلا قائد')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText(/يصعد المدير إلى ناصر القحطاني \(قطاع التشغيل\)/)).toBeInTheDocument();
    expect(within(rows[3] as HTMLElement).getByText(/لا قائد أعلى في هذه الشركة: المدير فارغ/)).toBeInTheDocument();
  });

  it('lists an acting leader with the window and the state', async () => {
    const acting = leaderRow({ id: 'l2', kind: 'acting', employeeName: 'سلمان الدوسري', status: 'scheduled', validFrom: '2099-01-01', validTo: '2099-02-01', reason: 'إجازة القائد' });
    openOrgPage({ handlers: [serve(leadersDto({ items: [leaderRow(), acting] }))] });
    const details = await openLeaders('قسم الموارد البشرية');
    const section = (await within(details).findByRole('heading', { name: 'القائم بالأعمال والتعيينات المجدولة' })).closest('section') as HTMLElement;
    expect(within(section).getByText('سلمان الدوسري')).toBeInTheDocument();
    expect(within(section).getByText('مجدول')).toBeInTheDocument();
    expect(section).toHaveTextContent('من 2099-01-01 إلى 2099-02-01');
  });

  it('hides the buttons from a person without the leaders key, and while admin mode is off', async () => {
    openOrgPage({ keys: [], adminMode: true, handlers: [serve(leadersDto())] });
    const details = await openLeaders('قسم الموارد البشرية');
    await within(details).findByText('خالد العتيبي');
    expect(within(details).queryByRole('button', { name: 'تعيين قائد أو قائم بالأعمال' })).not.toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: /^إنهاء/ })).not.toBeInTheDocument();
  });

  it('hides them while admin mode is off even with the key', async () => {
    openOrgPage({ keys: [CorePermission.OrgLeadersManage], adminMode: false, handlers: [serve(leadersDto())] });
    const details = await openLeaders('قسم الموارد البشرية');
    await within(details).findByText('خالد العتيبي');
    expect(within(details).queryByRole('button', { name: 'تعيين قائد أو قائم بالأعمال' })).not.toBeInTheDocument();
  });

  it('ends a leader in force after a reason, and removes one that has not started after a confirmation', async () => {
    const sent: unknown[] = [];
    const removed: string[] = [];
    const scheduled = leaderRow({ id: 'l2', status: 'scheduled', validFrom: '2099-01-01', employeeName: 'سلمان الدوسري' });
    openOrgPage({
      keys: [CorePermission.OrgLeadersManage],
      adminMode: true,
      handlers: [
        serve(leadersDto({ items: [leaderRow(), scheduled] })),
        http.post('*/api/org/nodes/:id/leaders/:leaderId/end', async ({ request, params }) => { sent.push({ leaderId: params.leaderId, ...(await request.json() as object) }); return HttpResponse.json(leadersDto()); }),
        http.delete('*/api/org/nodes/:id/leaders/:leaderId', ({ params }) => { removed.push(String(params.leaderId)); return HttpResponse.json(leadersDto()); }),
      ],
    });
    const details = await openLeaders('قسم الموارد البشرية');
    fireEvent.click(await within(details).findByRole('button', { name: 'إنهاء: خالد العتيبي' }));
    const dialog = await screen.findByRole('dialog', { name: 'إنهاء القائد' });
    const end = within(dialog).getByRole('button', { name: 'إنهاء' });
    expect(end).toBeDisabled(); // no reason yet
    fireEvent.change(within(dialog).getByLabelText('السبب *'), { target: { value: 'انتقل إلى إدارة أخرى' } });
    await waitFor(() => expect(end).toBeEnabled());
    fireEvent.click(end);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ leaderId: 'l1', reason: 'انتقل إلى إدارة أخرى' });
    fireEvent.click(await within(details).findByRole('button', { name: 'حذف: سلمان الدوسري' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'حذف التعيين؟' })).getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(removed).toEqual(['l2']));
  });
});
