import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './date-input';

function Controlled({ min, max }: { min?: string; max?: string }) {
  const [value, setValue] = useState('');
  return <DateInput aria-label="day" value={value} min={min} max={max} onChange={(e) => setValue(e.target.value)} />;
}

const box = () => screen.getByLabelText('day') as HTMLInputElement;

describe('FR-201: DateInput', () => {
  it('is a left-to-right text box with the platform form as its hint, never the browser date control', () => {
    render(<Controlled />);
    expect(box()).toHaveAttribute('type', 'text');
    expect(box()).toHaveAttribute('dir', 'ltr');
    expect(box()).toHaveAttribute('placeholder', 'YYYY-MM-DD');
    expect(box()).toHaveAttribute('inputmode', 'numeric');
  });

  it('writes Latin digits with the dashes added for the person, also when Arabic-Indic digits are typed', () => {
    render(<Controlled />);
    fireEvent.change(box(), { target: { value: '١٩٩٦١١٢٤' } });
    expect(box().value).toBe('1996-11-24');
    fireEvent.change(box(), { target: { value: '1996-11-2' } });
    expect(box().value).toBe('1996-11-2');
  });

  it('lets the person type the dashes themselves, one key at a time, and ends with the same day as without them', () => {
    render(<Controlled />);
    let shown = '';
    for (const key of '1995-03-12') {
      fireEvent.change(box(), { target: { value: shown + key } });
      shown = box().value;
    }
    expect(box().value).toBe('1995-03-12');
    fireEvent.change(box(), { target: { value: '' } });
    shown = '';
    for (const key of '1995-3-5') {
      fireEvent.change(box(), { target: { value: shown + key } });
      shown = box().value;
    }
    expect(box().value).toBe('1995-03-5');
  });

  it('marks an unfinished day, a day that does not exist and a day outside min / max once the person leaves the box', () => {
    render(<Controlled min="2026-11-27" />);
    fireEvent.change(box(), { target: { value: '2026-1' } });
    expect(box()).toHaveAttribute('aria-invalid', 'false');
    fireEvent.blur(box());
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(box(), { target: { value: '2026-02-30' } });
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(box(), { target: { value: '2026-11-01' } });
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(box(), { target: { value: '2026-12-01' } });
    expect(box()).toHaveAttribute('aria-invalid', 'false');
  });

  it('works with react-hook-form register and hands over exactly YYYY-MM-DD', () => {
    const seen = vi.fn();
    function Form() {
      const { register, handleSubmit } = useForm<{ birthDate: string }>({ defaultValues: { birthDate: '' } });
      return <form onSubmit={handleSubmit((v) => seen(v.birthDate))}><DateInput aria-label="day" {...register('birthDate')} /><button>go</button></form>;
    }
    render(<Form />);
    fireEvent.change(box(), { target: { value: '19961124' } });
    fireEvent.click(screen.getByText('go'));
    return vi.waitFor(() => expect(seen).toHaveBeenCalledWith('1996-11-24'));
  });

  it('a day chosen in the calendar is written into the text box in the same form', () => {
    render(<Controlled />);
    const picker = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(picker, { target: { value: '2026-12-01' } });
    expect(box().value).toBe('2026-12-01');
  });

  it('locks the calendar button together with the box', () => {
    render(<DateInput aria-label="day" readOnly value="2026-12-01" onChange={() => undefined} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
