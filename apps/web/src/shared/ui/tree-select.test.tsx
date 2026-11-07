import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TreeSelect, type TreeSelectItem } from './tree-select';

const items: TreeSelectItem[] = [
  { id: 's', parentId: null, label: 'قطاع التشغيل', hint: 'أروقة — قطاع التشغيل' },
  { id: 'd', parentId: 's', label: 'إدارة المشاريع', hint: 'أروقة — قطاع التشغيل — إدارة المشاريع' },
  { id: 'x', parentId: 'd', label: 'قسم التخطيط', hint: 'أروقة — قطاع التشغيل — إدارة المشاريع — قسم التخطيط' },
  { id: 'g', parentId: null, label: 'قطاع النمو' },
];

function Harness() {
  const [value, setValue] = useState<string | null>(null);
  return <TreeSelect label="الجهة" value={value} onChange={setValue} items={items} />;
}

describe('TreeSelect', () => {
  it('opens on the top items, drills into one, climbs back and picks', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'الجهة' }));
    expect(screen.getByText('قطاع التشغيل')).toBeInTheDocument();
    expect(screen.queryByText('إدارة المشاريع')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /فتح ما بداخل قطاع التشغيل|Open what is inside/ }));
    expect(screen.getByText('إدارة المشاريع')).toBeInTheDocument();
    expect(screen.queryByText('قطاع النمو')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /الرجوع|Back from/ }));
    expect(screen.getByText('قطاع النمو')).toBeInTheDocument();
    fireEvent.click(screen.getByText('قطاع النمو'));
    expect(screen.getByRole('combobox', { name: 'الجهة' })).toHaveTextContent('قطاع النمو');
  });

  it('searches the whole tree by name at once, with the path under each match', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'الجهة' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'الجهة' }), { target: { value: 'التخطيط' } });
    expect(screen.getByText('قسم التخطيط')).toBeInTheDocument();
    expect(screen.queryByText('قطاع النمو')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('قسم التخطيط'));
    expect(screen.getByRole('combobox', { name: 'الجهة' })).toHaveTextContent('قسم التخطيط');
  });
});
