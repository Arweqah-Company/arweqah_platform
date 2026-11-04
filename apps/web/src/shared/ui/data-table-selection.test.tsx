import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DataTable } from './data-table';

const rows = [{ id: 'a', name: 'سارة' }, { id: 'b', name: 'خالد' }];

function Harness({ initial = [] as string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  return (
    <>
      <p data-testid="chosen">{[...selected].sort().join(',')}</p>
      <DataTable caption="people" rows={rows} rowKey={(r) => r.id} view="table" selection={{ selected, onChange: setSelected }} columns={[{ id: 'name', header: 'الاسم', cell: (r) => r.name }]} />
    </>
  );
}

describe('Row selection in the shared table', () => {
  it('picks a row without opening it, and picks or clears the whole page from the header box', () => {
    render(<Harness />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    fireEvent.click(boxes[1] as HTMLElement);
    expect(screen.getByTestId('chosen')).toHaveTextContent('a');
    fireEvent.click(boxes[0] as HTMLElement);
    expect(screen.getByTestId('chosen')).toHaveTextContent('a,b');
    fireEvent.click(boxes[0] as HTMLElement);
    expect(screen.getByTestId('chosen')).toHaveTextContent('');
  });

  it('keeps what was chosen on other pages when the page box is used', () => {
    render(<Harness initial={['z']} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLElement);
    expect(screen.getByTestId('chosen')).toHaveTextContent('a,b,z');
  });
});
