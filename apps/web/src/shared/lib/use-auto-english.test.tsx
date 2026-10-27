import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/msw';
import { useAutoEnglish } from './use-auto-english';

function Pair() {
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');
  useAutoEnglish(ar, en, setEn);
  return (
    <>
      <input aria-label="ar" value={ar} onChange={(e) => setAr(e.target.value)} />
      <input aria-label="en" value={en} onChange={(e) => setEn(e.target.value)} />
    </>
  );
}

const translate = () => {
  const asked: string[] = [];
  server.use(http.post('*/api/translate', async ({ request }) => {
    const { text } = (await request.json()) as { text: string };
    asked.push(text);
    return HttpResponse.json({ text: `EN ${text.length}` });
  }));
  return asked;
};

describe('English field filled from Arabic while typing (FR-58)', () => {
  it('fills an empty English field when the person pauses, and follows further Arabic edits', async () => {
    const asked = translate();
    render(<Pair />);
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'إدارة' } });
    await waitFor(() => expect(screen.getByLabelText('en')).toHaveValue('EN 5'));
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'إدارة المشتريات' } });
    await waitFor(() => expect(screen.getByLabelText('en')).toHaveValue('EN 15'));
    expect(asked).toEqual(['إدارة', 'إدارة المشتريات']);
  });

  it('never overwrites English the person wrote or changed', async () => {
    const asked = translate();
    render(<Pair />);
    fireEvent.change(screen.getByLabelText('en'), { target: { value: 'Procurement' } });
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'المشتريات' } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.getByLabelText('en')).toHaveValue('Procurement');
    expect(asked).toHaveLength(0);
  });

  it('stops following once the person edits the translated English', async () => {
    translate();
    render(<Pair />);
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'إدارة' } });
    await waitFor(() => expect(screen.getByLabelText('en')).toHaveValue('EN 5'));
    fireEvent.change(screen.getByLabelText('en'), { target: { value: 'Department' } });
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'إدارة الموارد' } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.getByLabelText('en')).toHaveValue('Department');
  });

  it('does not call the service for text without Arabic letters', async () => {
    const asked = translate();
    render(<Pair />);
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'IT 2024' } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(asked).toHaveLength(0);
    expect(screen.getByLabelText('en')).toHaveValue('');
  });

  it('leaves the field alone when translation is not available', async () => {
    render(<Pair />);
    fireEvent.change(screen.getByLabelText('ar'), { target: { value: 'إدارة' } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.getByLabelText('en')).toHaveValue('');
  });
});
