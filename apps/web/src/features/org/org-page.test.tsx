import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { OrgPage } from './org-page';

const level = (id: string, sortOrder: number, names: [string, string], isAssignable = false) => ({ id, companyId: 'c1', sortOrder, nameAr: names[0], nameEn: names[1], isAssignable, unitsCount: 0 });
const emptyTree = { companyId: 'c1', nodes: [], levels: [level('l1', 1, ['قطاع', 'Sector']), level('l2', 2, ['إدارة', 'Department']), level('l3', 3, ['قسم', 'Section']), level('l4', 4, ['وحدة', 'Unit'], true)] };

const open = () => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: 'org.view', scope: 'all' }, { key: 'org.manage', scope: 'all' }]))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
    http.get('*/api/org/companies/c1/tree', () => HttpResponse.json(emptyTree)),
  );
  renderPage(<OrgPage />);
};

describe('Organization page for a company with no units yet (FR-13)', () => {
  it('shows the company levels and opens the levels form from the button', async () => {
    open();
    expect(await screen.findByText(/قطاع › إدارة › قسم › وحدة/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'تقسيمات الهيكل' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the add-unit form even when the tree is empty', async () => {
    open();
    await screen.findByText(/قطاع › إدارة › قسم › وحدة/);
    fireEvent.click(screen.getByRole('button', { name: 'إضافة وحدة' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
