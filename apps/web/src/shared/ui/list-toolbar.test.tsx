import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useFilters } from '../lib/use-filters';
import type { ViewMode } from '../lib/use-view-mode';
import { DataTable } from './data-table';
import { ListToolbar, type FilterField } from './list-toolbar';
import { chooseOption } from '../../../test/select';

const rows = [{ id: '1', name: 'أروقة', status: 'active' }, { id: '2', name: 'لدن', status: 'inactive' }];
const fields: FilterField[] = [
  { id: 'status', label: 'الحالة', type: 'select', options: [{ value: 'active', label: 'نشط' }, { value: 'inactive', label: 'معطّل' }] },
  { id: 'recent', label: 'حديثة', type: 'toggle' },
  { id: 'from', label: 'من تاريخ', type: 'date' },
];

function Harness() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('table');
  const filters = useFilters(() => undefined);
  const shown = rows.filter((r) => r.name.includes(search) && (!filters.values.status || r.status === filters.values.status));
  return (
    <DataTable
      caption="الشركات"
      rows={shown}
      rowKey={(r) => r.id}
      view={view}
      toolbar={<ListToolbar search={{ value: search, onChange: setSearch, label: 'بحث' }} filters={{ fields, values: filters.values, onChange: filters.set }} view={{ value: view, onChange: setView }} />}
      columns={[{ id: 'name', header: 'الاسم', cell: (r) => r.name }]}
    />
  );
}

describe('List toolbar: search, filters and view (FR-27)', () => {
  it('switches between a table and cards, and says which view is on', () => {
    render(<Harness />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'جدول' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'بطاقات' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بطاقات' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('searches the list', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('بحث'), { target: { value: 'لدن' } });
    expect(screen.queryByText('أروقة')).not.toBeInTheDocument();
    expect(screen.getByText('لدن')).toBeInTheDocument();
  });

  it('filters from the panel, shows the applied filter as a chip and removes it again', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /تصفية/ }));
    await chooseOption((await screen.findByLabelText('الحالة')), 'inactive');
    expect(screen.queryByText('أروقة')).not.toBeInTheDocument();
    const chip = screen.getByRole('list', { name: 'عوامل التصفية المطبّقة' });
    expect(chip).toHaveTextContent('الحالة: معطّل');
    fireEvent.click(screen.getByRole('button', { name: 'إزالة التصفية: الحالة' }));
    expect(screen.getByText('أروقة')).toBeInTheDocument();
  });
});
