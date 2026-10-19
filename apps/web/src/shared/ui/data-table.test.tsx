import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

const columns = [{ header: 'الاسم', cell: (r: { name: string }) => r.name }];

describe('DataTable', () => {
  it('renders rows under accessible headers', () => {
    render(<DataTable caption="قائمة" columns={columns} rows={[{ name: 'سارة' }]} rowKey={(r) => r.name} />);
    expect(screen.getByRole('columnheader', { name: 'الاسم' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'سارة' })).toBeInTheDocument();
  });

  it('shows the empty message when there are no rows', () => {
    render(<DataTable caption="قائمة" columns={columns} rows={[]} rowKey={(r) => r.name} empty="لا أحد" />);
    expect(screen.getByText('لا أحد')).toBeInTheDocument();
  });

  it('pages forward and disables "previous" on the first page', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable caption="قائمة" columns={columns} rows={[{ name: 'a' }]} rowKey={(r) => r.name} page={{ page: 1, pageSize: 20, total: 45 }} onPageChange={onPageChange} />,
    );
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
