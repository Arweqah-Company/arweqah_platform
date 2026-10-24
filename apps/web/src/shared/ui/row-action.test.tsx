import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RowAction } from './row-action';

describe('RowAction: an action on a row as an icon', () => {
  it('is a button named by its label, shown as an icon only, with the label as its tooltip', () => {
    const onClick = vi.fn();
    render(<RowAction label="تعديل" icon={Pencil} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'تعديل' });
    expect(button).toHaveAttribute('title', 'تعديل');
    expect(button.textContent).toBe('');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is a link when it goes to a page, and can be disabled or marked as dangerous', () => {
    render(
      <MemoryRouter>
        <RowAction label="عرض" icon={Pencil} to="/x/1" />
        <RowAction label="حذف" icon={Pencil} danger disabled />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'عرض' })).toHaveAttribute('href', '/x/1');
    expect(screen.getByRole('button', { name: 'حذف' })).toBeDisabled();
  });
});
