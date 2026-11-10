import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/msw';
import { GROUP_COMPANY, leadersDto, N, orgNodes } from '../../../test/org-fixtures';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { LeaderDialog } from './leader-dialog';

const node = orgNodes.find((n) => n.id === N.section) as (typeof orgNodes)[number];
const companies = [{ id: GROUP_COMPANY, code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }, { id: 'c2', code: 'LDN', nameAr: 'لدن', nameEn: 'Ladun' }];

/** What the page needs: the companies, and the employees of a company found by the search. */
function serveEmployees(asked: URLSearchParams[]) {
  server.use(
    http.get('*/api/lookups/companies', () => HttpResponse.json(companies)),
    http.get('*/api/employees', ({ request }) => {
      const params = new URL(request.url).searchParams;
      asked.push(params);
      return HttpResponse.json({ items: [{ id: 'emp-1', employeeNumber: 'E100', fullName: 'نورة السبيعي', company: { id: params.get('companyId'), nameAr: '', nameEn: '' } }], total: 1, page: 1, pageSize: 20 });
    }),
  );
}

describe('Assign a leader or an acting leader (FR-100)', () => {
  it('offers only the group company for a shared unit and says why', async () => {
    serveEmployees([]);
    renderPage(<LeaderDialog node={node} leaders={leadersDto()} onClose={() => undefined} />);
    expect(await screen.findByText(/الوحدة مشتركة: يُعيَّن قائدها من شركة المجموعة فقط/)).toBeInTheDocument();
    const company = screen.getByLabelText('الشركة *');
    fireEvent.click(company);
    await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent)).toContain('أروقة الريادة'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).not.toContain('لدن');
  });

  it('lists only the employees of the chosen company and clears the employee when the company changes', async () => {
    const asked: URLSearchParams[] = [];
    serveEmployees(asked);
    renderPage(<LeaderDialog node={node} leaders={leadersDto({ effectiveMode: 'per_company' })} onClose={() => undefined} />);
    expect(await screen.findByText('اختر الشركة أولًا: يُعرض موظفوها فقط.')).toBeInTheDocument();
    expect(screen.getByLabelText('الموظف')).toBeDisabled();
    await chooseOption(screen.getByLabelText('الشركة *'), 'c2');
    await chooseOption(await screen.findByLabelText('الموظف'), 'emp-1');
    expect(asked.some((p) => p.get('companyId') === 'c2' && p.get('status') === 'active')).toBe(true);
    expect(screen.getByLabelText('الموظف')).toHaveTextContent('نورة السبيعي');
    await chooseOption(screen.getByLabelText('الشركة *'), GROUP_COMPANY);
    await waitFor(() => expect(screen.getByLabelText('الموظف')).not.toHaveTextContent('نورة السبيعي'));
  });

  it('needs an end date for an acting leader and a reason, and talks while the person types', async () => {
    serveEmployees([]);
    renderPage(<LeaderDialog node={node} leaders={leadersDto()} onClose={() => undefined} />);
    await chooseOption(await screen.findByLabelText('الموظف'), 'emp-1');
    await chooseOption(screen.getByLabelText('النوع *'), 'acting');
    expect(screen.queryByLabelText('مسماه في الوحدة *')).not.toBeInTheDocument(); // an acting leader stays where they are
    expect(await screen.findByText(/القائم بالأعمال يحمل دور القائد طوال مدته فقط/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'ab' } });
    expect(await screen.findByText('يجب ألا يقل عن 3 أحرف.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'إجازة القائد' } });
    const end = screen.getByLabelText('ينتهي في *');
    fireEvent.blur(end);
    expect(await screen.findByText('القائم بالأعمال يحتاج تاريخ نهاية.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(end, { target: { value: '2099-12-31' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
  });

  it('sends the leader with the dates and the reason, and closes', async () => {
    serveEmployees([]);
    const sent: unknown[] = [];
    server.use(http.put('*/api/org/nodes/:id/leaders', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json(leadersDto()); }));
    const onClose = vi.fn();
    renderPage(<LeaderDialog node={node} leaders={leadersDto()} onClose={onClose} />);
    await chooseOption(await screen.findByLabelText('الموظف'), 'emp-1');
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'تعيين جديد' } });
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled(); // a leader always chooses the title they lead with
    await chooseOption(screen.getByLabelText('مسماه في الوحدة *'), 't1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent[0]).toMatchObject({ companyId: GROUP_COMPANY, employeeId: 'emp-1', kind: 'leader', jobTitleId: 't1', validTo: null, reason: 'تعيين جديد' });
  });

  it('shows the API refusal inside the dialog', async () => {
    serveEmployees([]);
    server.use(http.put('*/api/org/nodes/:id/leaders', () => HttpResponse.json({ statusCode: 422, code: 'ORG_ACTING_NEEDS_LEADER', message: 'يحتاج القائم بالأعمال قائدًا قائمًا' }, { status: 422 })));
    renderPage(<LeaderDialog node={node} leaders={leadersDto()} onClose={() => undefined} />);
    await chooseOption(await screen.findByLabelText('الموظف'), 'emp-1');
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'تعيين جديد' } });
    await chooseOption(screen.getByLabelText('مسماه في الوحدة *'), 't1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText(/يحتاج القائم بالأعمال قائدًا قائمًا/)).toBeInTheDocument();
  });
});

