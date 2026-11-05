import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { listItem, titleCard } from '../../../test/job-titles-fixtures';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { AddTitlesDialog, EditTitleDialog } from './titles-forms';

describe('Add job titles to a unit (FR-104)', () => {
  it('needs both names, the grade and the track before it saves, and sends them', async () => {
    const sent: unknown[] = [];
    const onOpenChange = vi.fn();
    server.use(http.post('*/api/org/nodes/:id/job-titles', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json([], { status: 201 }); }));
    renderPage(<AddTitlesDialog unitId="u1" open onOpenChange={onOpenChange} />);
    const save = await screen.findByRole('button', { name: 'حفظ' });
    fireEvent.change(screen.getByLabelText('الاسم بالعربي'), { target: { value: 'محلل أعمال' } });
    fireEvent.change(screen.getByLabelText('الاسم بالإنجليزي'), { target: { value: 'Business analyst' } });
    expect(save).toBeDisabled(); // no grade and track yet
    await chooseOption(screen.getByLabelText('الدرجة *'), '7');
    expect(save).toBeDisabled();
    await chooseOption(screen.getByLabelText('المسار *'), 'P');
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(sent).toEqual([{ jobTitles: [{ nameAr: 'محلل أعمال', nameEn: 'Business analyst', grade: 7, track: 'P' }] }]);
  });
});

describe('The reporting line of a new title (FR-104)', () => {
  it('searches the titles by name or code and sends the one chosen', async () => {
    const sent: unknown[] = [];
    const asked: string[] = [];
    server.use(
      http.get('*/api/org/job-titles', ({ request }) => { asked.push(new URL(request.url).searchParams.get('search') ?? ''); return HttpResponse.json({ items: [listItem({ id: 't9', nameAr: 'رئيس الحسابات', code: 'OPS.03.03.01-L5M-01' })], total: 1, page: 1, pageSize: 20 }); }),
      http.post('*/api/org/nodes/:id/job-titles', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json([], { status: 201 }); }),
    );
    renderPage(<AddTitlesDialog unitId="u1" open onOpenChange={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('الاسم بالعربي'), { target: { value: 'محلل أعمال' } });
    fireEvent.change(screen.getByLabelText('الاسم بالإنجليزي'), { target: { value: 'Business analyst' } });
    await chooseOption(screen.getByLabelText('الدرجة *'), '7');
    await chooseOption(screen.getByLabelText('المسار *'), 'P');
    await chooseOption(await screen.findByLabelText('يرفع إلى'), 't9');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ jobTitles: [{ grade: 7, track: 'P', reportsToTitleId: 't9' }] });
    expect(asked.length).toBeGreaterThan(0);
  });
});

describe('Edit a job title (FR-104)', () => {
  const title = { id: 't1', orgNodeId: 'u1', nameAr: 'أخصائي', nameEn: 'Specialist', isActive: true, employeesCount: 0, code: null, grade: null, track: null, reportsToTitleId: null, contentVersion: 1 };

  it('starts on the line the card says and clears it when the person clears it', async () => {
    const sent: unknown[] = [];
    server.use(
      http.get('*/api/org/job-titles/:id/card', () => HttpResponse.json(titleCard({ id: 't1' }))),
      http.put('*/api/org/job-titles/:id', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json(title); }),
    );
    renderPage(<EditTitleDialog title={{ ...title, code: 'OPS.03.03.01-L7P-01', grade: 7, track: 'P', reportsToTitleId: 't2' }} open onOpenChange={() => undefined} />);
    const field = await screen.findByLabelText('يرفع إلى');
    await waitFor(() => expect(field).toHaveTextContent('رئيس الحسابات'));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).not.toHaveProperty('reportsToTitleId'); // untouched: nothing is sent
    fireEvent.click(screen.getByRole('button', { name: 'مسح الاختيار' }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toMatchObject({ reportsToTitleId: null });
  });

  it('asks for the grade and track of a title that has none, together or not at all', async () => {
    const sent: unknown[] = [];
    server.use(http.put('*/api/org/job-titles/:id', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json(title); }));
    renderPage(<EditTitleDialog title={title} open onOpenChange={() => undefined} />);
    await screen.findByText(/هذا المسمى بلا رمز/);
    await chooseOption(screen.getByLabelText('الدرجة *'), '5');
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled()); // a grade without a track
    await chooseOption(screen.getByLabelText('المسار *'), 'M');
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ nameAr: 'أخصائي', isActive: true, grade: 5, track: 'M' });
  });

  it('does not offer them for a title that already has its code', async () => {
    renderPage(<EditTitleDialog title={{ ...title, code: 'OPS.03.03.01-L7P-01', grade: 7, track: 'P' }} open onOpenChange={() => undefined} />);
    await screen.findByLabelText('الاسم بالعربي *');
    expect(screen.queryByLabelText('الدرجة *')).not.toBeInTheDocument();
  });
});
