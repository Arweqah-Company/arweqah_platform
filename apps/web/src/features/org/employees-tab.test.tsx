import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
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
    fireEvent.click(await within(details).findByRole('button', { name: /سارة أحمد/ }));
    const dialog = await screen.findByRole('dialog');
    for (const text of ['E-1001', 'sara@arweqah.sa', 'قسم الموارد البشرية', 'خالد العتيبي']) expect(within(dialog).getByText(text)).toBeInTheDocument();
  });

  it('says so when nobody is placed directly in the unit', async () => {
    openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/employees', () => HttpResponse.json([]))] });
    const details = await openTab();
    expect(await within(details).findByText('لا يوجد موظفون في هذه الوحدة مباشرة.')).toBeInTheDocument();
  });
});
