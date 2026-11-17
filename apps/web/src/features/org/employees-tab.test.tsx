import { fireEvent, screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

const people = [
  { id: 'e1', employeeNumber: 'E-1001', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa', managerName: 'خالد العتيبي' },
  { id: 'e2', employeeNumber: 'E-1002', fullName: 'ليلى سعد', workEmail: 'laila@arweqah.sa', managerName: null },
];

async function openTab() {
  fireEvent.click(await screen.findByRole('button', { name: 'قسم الموارد البشرية' }));
  const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية' });
  fireEvent.click(within(details).getByRole('tab', { name: 'موظفو الوحدة' }));
  return details;
}

describe('The employees tab of a unit (FR-17)', () => {
  it('lists the names and opens work number, work e-mail, unit and manager on a click', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json(people))] });
    const details = await openTab();
    fireEvent.click(await within(details).findByText('سارة أحمد')); // a click anywhere on the row opens it
    const dialog = await screen.findByRole('dialog');
    for (const text of ['E-1001', 'sara@arweqah.sa', 'قسم الموارد البشرية', 'خالد العتيبي']) expect(within(dialog).getByText(text)).toBeInTheDocument();
  });

  it('lists names only (the tab is narrow): the number, e-mail and manager show only in the popup', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json(people))] });
    const details = await openTab();
    expect(await within(details).findByText('سارة أحمد')).toBeInTheDocument();
    for (const text of ['E-1001', 'sara@arweqah.sa', 'خالد العتيبي']) expect(within(details).queryByText(text)).not.toBeInTheDocument();
  });

  it('puts «Chat on Teams» in the dialog (the Employee role holds its key) (FR-154)', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json(people))] });
    const details = await openTab();
    fireEvent.click(await within(details).findByText('سارة أحمد'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('link', { name: 'محادثة على Teams' })).toHaveAttribute('href', 'https://teams.microsoft.com/l/chat/0/0?users=sara%40arweqah.sa');
  });

  it('shows loading (not «0 employees» or the empty text) while the list is on its way', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', async () => { await delay(300); return HttpResponse.json(people); })] });
    const details = await openTab();
    expect(within(details).queryByText('لا يوجد موظفون في هذه الوحدة مباشرة.')).not.toBeInTheDocument();
    expect(await within(details).findByText('سارة أحمد')).toBeInTheDocument();
  });

  it('is a list like the others without the cards view: a search box that finds by name or e-mail, and a message when nothing matches', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json(people))] });
    const details = await openTab();
    expect(await within(details).findByText('سارة أحمد')).toBeInTheDocument();
    expect(details.querySelector('[data-tour="view-switch"]')).toBeNull(); // no table / cards switch: the tab is too narrow for cards
    fireEvent.change(within(details).getByRole('searchbox', { name: 'البحث في موظفي الوحدة' }), { target: { value: 'laila@' } });
    expect(await within(details).findByText('ليلى سعد')).toBeInTheDocument();
    await vi.waitFor(() => expect(within(details).queryByText('سارة أحمد')).not.toBeInTheDocument());
    fireEvent.change(within(details).getByRole('searchbox', { name: 'البحث في موظفي الوحدة' }), { target: { value: 'zzz-nobody' } });
    expect(await within(details).findByText('لا يوجد موظف يطابق البحث.')).toBeInTheDocument();
  });

  it('says so when nobody is placed directly in the unit', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json([]))] });
    const details = await openTab();
    expect(await within(details).findByText('لا يوجد موظفون في هذه الوحدة مباشرة.')).toBeInTheDocument();
  });
});
