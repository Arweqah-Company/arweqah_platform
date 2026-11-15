import type { TicketCatalogDto } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { NewTicketDialog } from './new-ticket-dialog';

const person = { id: 'p1', name: 'منى' };
const catalog: TicketCatalogDto = {
  today: '2026-10-25',
  desks: [
    {
      deskId: 'd1', nameAr: 'تقنية المعلومات', nameEn: 'IT', descriptionAr: null, descriptionEn: null, unavailableReason: null, minLeadDays: 0,
      types: [
        { id: 't1', nameAr: 'مشكلة في الجهاز', nameEn: 'Device problem', descriptionAr: null, descriptionEn: null, isPersonal: false, dueDays: 2, assignee: person, available: true },
      ],
    },
    {
      deskId: 'd2', nameAr: 'الموارد البشرية', nameEn: 'HR', descriptionAr: null, descriptionEn: null, unavailableReason: 'paused', minLeadDays: 0,
      types: [
        { id: 't2', nameAr: 'شهادة راتب', nameEn: 'Salary letter', descriptionAr: null, descriptionEn: null, isPersonal: false, dueDays: 3, assignee: null, available: true },
      ],
    },
  ],
};

const open = () => {
  server.use(http.get('*/api/tickets/catalog', () => HttpResponse.json(catalog)));
  renderPage(<NewTicketDialog open onOpenChange={() => undefined} />);
};

describe('FR-37 new ticket dialog', () => {
  it('filters kinds of ticket while typing and disables a paused desk', async () => {
    open();
    const search = await screen.findByLabelText('ماذا تحتاج؟');
    expect(await screen.findByText('شهادة راتب')).toBeInTheDocument();
    expect(screen.getByText('شهادة راتب').closest('button')).toBeDisabled();
    fireEvent.change(search, { target: { value: 'جهاز' } });
    expect(screen.queryByText('شهادة راتب')).not.toBeInTheDocument();
    expect(screen.getByText('مشكلة في الجهاز')).toBeInTheDocument();
  });

  it('keeps what was typed when going back to change the kind', async () => {
    open();
    fireEvent.click((await screen.findByText('مشكلة في الجهاز')).closest('button')!);
    const title = await screen.findByLabelText(/العنوان/);
    fireEvent.change(title, { target: { value: 'الشاشة لا تعمل' } });
    fireEvent.click(screen.getByRole('button', { name: /تغيير/ }));
    fireEvent.click((await screen.findByText('مشكلة في الجهاز')).closest('button')!);
    expect(await screen.findByLabelText(/العنوان/)).toHaveValue('الشاشة لا تعمل');
  });

  it('narrows by department and by kind, and counts what is left (FR-37)', async () => {
    open();
    await screen.findByText('شهادة راتب');
    fireEvent.click(screen.getByRole('combobox', { name: 'الجهة' }));
    fireEvent.click(await screen.findByRole('option', { name: 'تقنية المعلومات' }));
    expect(screen.queryByText('شهادة راتب')).not.toBeInTheDocument();
    expect(screen.getByText('نوع واحد')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: 'نوع الطلب' }));
    fireEvent.click(await screen.findByRole('option', { name: 'شخصي' }));
    expect(await screen.findByText('لا يوجد نوع مطابق لبحثك.')).toBeInTheDocument();
  });

  it('shows one compact list for a long catalog, thirty at a time, and remembers the view (FR-37)', async () => {
    const many: TicketCatalogDto = { ...catalog, desks: [{ ...catalog.desks[0]!, types: Array.from({ length: 45 }, (_, i) => ({ id: `x${i}`, nameAr: `نوع ${i}`, nameEn: `Type ${i}`, descriptionAr: null, descriptionEn: null, isPersonal: false, dueDays: 2, assignee: null, available: true })) }] };
    server.use(http.get('*/api/tickets/catalog', () => HttpResponse.json(many)));
    renderPage(<NewTicketDialog open onOpenChange={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'قائمة مضغوطة' }));
    expect(await screen.findAllByRole('listitem')).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: /عرض المزيد/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(45);
    expect(window.localStorage.getItem('view:ticket-types')).toBe('list');
  });
});
