import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListSettingsProvider } from '../lib/list-settings';
import { DataTable } from './data-table';
import { ListToolbar } from './list-toolbar';

const columns = [
  { id: 'code', header: 'الرمز', cell: (r: { code: string }) => r.code },
  { id: 'employees', header: 'الموظفون', cell: () => '3' },
];
const toolbar = (
  <ListToolbar
    listKey="companies"
    search={{ value: '', onChange: () => undefined, label: 'بحث' }}
    filters={{ fields: [{ id: 'status', label: 'الحالة', type: 'text' }, { id: 'employees', label: 'له موظفون', type: 'text' }], values: {}, onChange: () => undefined }}
  />
);

describe('Hidden columns and filters of a list (FR-44)', () => {
  it('leaves out what an administrator hid, and nothing without a setting', () => {
    const view = (settings: object) => (
      <ListSettingsProvider value={settings}>
        <DataTable listKey="companies" caption="الشركات" view="table" columns={columns} rows={[{ code: 'ARW' }]} rowKey={(r) => r.code} toolbar={toolbar} />
      </ListSettingsProvider>
    );
    const { unmount } = render(view({}));
    expect(screen.getByRole('columnheader', { name: 'الموظفون' })).toBeInTheDocument();
    unmount();
    render(view({ companies: { hiddenColumns: ['employees'], hiddenFilters: ['status', 'employees'] } }));
    expect(screen.queryByRole('columnheader', { name: 'الموظفون' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'الرمز' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تصفية|الفلاتر/ })).not.toBeInTheDocument();
  });
});
