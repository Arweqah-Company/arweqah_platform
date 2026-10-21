import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeInput } from './code-input';

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
  const [value, setValue] = useState('');
  return <CodeInput label="رمز التطبيق" value={value} onChange={setValue} onComplete={onComplete} />;
}

const box = (n: number) => screen.getByLabelText(`رمز التطبيق ${n}`) as HTMLInputElement;

describe('CodeInput', () => {
  it('has one box per digit, always left-to-right, with an accessible group name', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'رمز التطبيق' })).toHaveAttribute('dir', 'ltr');
    expect([1, 2, 3, 4, 5, 6].map((n) => box(n).inputMode)).toEqual(Array(6).fill('numeric'));
    expect(box(1)).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('takes digits one by one, ignores letters, and reports the full code once', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.change(box(1), { target: { value: 'a' } });
    expect(box(1).value).toBe('');
    '123456'.split('').forEach((digit, i) => fireEvent.change(box(i + 1), { target: { value: digit } }));
    expect(box(3).value).toBe('3');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('fills every box when a whole code is pasted, ignoring spaces and dashes', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.paste(box(1), { clipboardData: { getData: () => '123 456' } });
    expect([1, 2, 3, 4, 5, 6].map((n) => box(n).value).join('')).toBe('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('deletes backwards with Backspace', () => {
    render(<Harness />);
    fireEvent.paste(box(1), { clipboardData: { getData: () => '1234' } });
    fireEvent.keyDown(box(4), { key: 'Backspace' });
    expect([1, 2, 3, 4].map((n) => box(n).value).join('')).toBe('123');
  });
});
