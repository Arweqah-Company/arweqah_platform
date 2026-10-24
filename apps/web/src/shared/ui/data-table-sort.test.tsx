import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

const rows = [{ id: '1', name: 'أ' }, { id: '2', name: 'ب' }];
const columns = [
  { id: 'name', header: 'الاسم', sortKey: 'name', cell: (r: (typeof rows)[number]) => r.name },
  { id: 'plain', header: 'بلا ترتيب', cell: () => '—' },
];

describe('DataTable sorting by a header', () => {
  it('makes a sortable header a button that asks for its key, and leaves other headers alone', () => {
    const onSort = vi.fn();
    render(<DataTable caption="جدول" columns={columns} rows={rows} rowKey={(r) => r.id} view="table" sort={{ key: 'other', dir: 'asc' }} onSort={onSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'الاسم' }));
    expect(onSort).toHaveBeenCalledWith('name');
    expect(screen.queryByRole('button', { name: 'بلا ترتيب' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'الاسم' })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'بلا ترتيب' })).not.toHaveAttribute('aria-sort');
  });

  it('tells which way the table is ordered', () => {
    render(<DataTable caption="جدول" columns={columns} rows={rows} rowKey={(r) => r.id} view="table" sort={{ key: 'name', dir: 'desc' }} onSort={() => undefined} />);
    expect(screen.getByRole('columnheader', { name: 'الاسم' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('keeps plain headers when no sorting is wired (every other list)', () => {
    render(<DataTable caption="جدول" columns={columns} rows={rows} rowKey={(r) => r.id} view="table" />);
    expect(screen.queryByRole('button', { name: 'الاسم' })).not.toBeInTheDocument();
  });
});
