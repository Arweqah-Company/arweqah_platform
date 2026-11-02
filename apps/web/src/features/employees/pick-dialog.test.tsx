import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../../test/render';
import { PickDialog } from './pick-dialog';

describe('Pick dialog (roles and groups of an employee)', () => {
  it('filters the options by name and says when nothing matches', () => {
    const options = [{ id: '1', label: 'موظف' }, { id: '2', label: 'قائد قطاع ساره' }];
    renderPage(<PickDialog title="أدوار" description="d" options={options} initial={['2']} save={async () => undefined} savedText="تم" open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'ابحث بالاسم' }), { target: { value: 'قائد' } });
    expect(screen.queryByRole('checkbox', { name: 'موظف' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'قائد قطاع ساره' })).toBeChecked();
    fireEvent.change(screen.getByRole('searchbox', { name: 'ابحث بالاسم' }), { target: { value: 'zzz' } });
    expect(screen.getByText('لا نتائج مطابقة.')).toBeInTheDocument();
  });
});
