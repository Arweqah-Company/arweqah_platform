import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';

describe('Alert colors follow the message (FR-32)', () => {
  it.each([
    ['success', 'bg-green-50', 'border-green-400'],
    ['info', 'bg-yellow-50', 'border-yellow-300'],
    ['danger', 'bg-danger-50', 'border-danger-700'],
    ['warning', 'bg-orange-50', 'border-orange-500'],
  ] as const)('%s uses %s with an icon and a start rule', (tone, background, border) => {
    render(<Alert tone={tone}>الرسالة</Alert>);
    const box = screen.getByText('الرسالة').closest('[role]') as HTMLElement;
    expect(box).toHaveClass(background, border, 'border-s-4');
    expect(box.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('an error is announced as an alert, the others as a status', () => {
    render(<><Alert tone="danger">خطأ</Alert><Alert tone="success">تم</Alert></>);
    expect(screen.getByRole('alert')).toHaveTextContent('خطأ');
    expect(screen.getByRole('status')).toHaveTextContent('تم');
  });
});
