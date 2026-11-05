import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalizedLinesField } from './localized-lines-field';

describe('LocalizedLinesField', () => {
  it('has a box per language and turns each line into an item', () => {
    const onChange = vi.fn();
    render(<LocalizedLinesField label="المخرجات" value={{ ar: ['أول'], en: [] }} onChange={onChange} maxItems={3} maxLength={10} />);
    expect(screen.getByLabelText('المخرجات: العربية')).toHaveValue('أول');
    fireEvent.change(screen.getByLabelText('المخرجات: English'), { target: { value: 'one\n\ntwo' } });
    expect(onChange).toHaveBeenCalledWith({ ar: ['أول'], en: ['one', 'two'] });
  });

  it('says what is wrong when a language has too many lines or a line is too long', () => {
    render(<LocalizedLinesField label="المخرجات" value={{ ar: ['1', '2', '3', '4'], en: ['x'.repeat(11)] }} onChange={() => undefined} maxItems={3} maxLength={10} />);
    expect(screen.getByText('لا يزيد عدد السطور على 3.')).toBeInTheDocument();
    expect(screen.getByText('لا يزيد السطر الواحد على 10 حرفًا.')).toBeInTheDocument();
  });
});
