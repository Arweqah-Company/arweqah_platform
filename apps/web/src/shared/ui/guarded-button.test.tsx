import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { GuardedButton } from './guarded-button';

describe('GuardedButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(toast, 'info').mockReturnValue(1);
  });

  it('acts when it is not blocked', () => {
    const onClick = vi.fn();
    render(<GuardedButton blocked={false} reason="why" onClick={onClick}>Go</GuardedButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-disabled');
  });

  it('stays visible and dimmed when blocked, does not act and says why instead of going silent', () => {
    const onClick = vi.fn();
    render(<GuardedButton blocked reason="Not yet" onClick={onClick}>Go</GuardedButton>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('Not yet');
  });
});
