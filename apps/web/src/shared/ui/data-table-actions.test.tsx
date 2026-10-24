import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

const rows = [{ id: '1', name: 'أ' }, { id: '2', name: 'ب' }];
const columns = [
  { id: 'name', header: 'الاسم', cell: (r: (typeof rows)[number]) => <a href={`#${r.id}`}>{r.name}</a> },
  { id: 'other', header: 'آخر', cell: () => 'قيمة' },
];

const table = (props: Partial<Parameters<typeof DataTable<(typeof rows)[number]>>[0]> = {}) =>
  render(<DataTable caption="جدول" columns={columns} rows={rows} rowKey={(r) => r.id} view="table" {...props} />);

describe('DataTable: the actions column and the click on a row', () => {
  it('puts every action of a row in the last column, headed "Actions"', () => {
    table({ actions: (r) => <><button type="button">عرض {r.name}</button><button type="button">حذف {r.name}</button></> });
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['الاسم', 'آخر', 'الإجراءات']);
    const first = screen.getAllByRole('row')[1] as HTMLElement;
    const cells = within(first).getAllByRole('cell');
    expect(within(cells.at(-1) as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['عرض أ', 'حذف أ']);
  });

  it('opens the row when it is clicked anywhere, but not when a button or a link inside it is clicked', () => {
    const open = vi.fn();
    table({ onRowClick: open, actions: () => <button type="button">إجراء</button> });
    fireEvent.click(screen.getAllByText('قيمة')[1] as HTMLElement);
    expect(open).toHaveBeenCalledWith(rows[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'إجراء' })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('link', { name: 'أ' }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a click when no view is given, and shows no actions column without actions', () => {
    table();
    fireEvent.click(screen.getAllByText('قيمة')[0] as HTMLElement);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('makes a whole card clickable on a phone and keeps the actions at its bottom', () => {
    const open = vi.fn();
    render(<DataTable caption="جدول" columns={columns} rows={rows} rowKey={(r) => r.id} view="cards" onRowClick={open} actions={() => <button type="button">إجراء</button>} />);
    const card = screen.getAllByRole('listitem')[0] as HTMLElement;
    fireEvent.click(within(card).getByText('قيمة'));
    expect(open).toHaveBeenCalledWith(rows[0]);
    expect(within(card).getByRole('button', { name: 'إجراء' })).toBeInTheDocument();
    expect(within(card).queryByText('الإجراءات')).not.toBeInTheDocument();
  });
});
