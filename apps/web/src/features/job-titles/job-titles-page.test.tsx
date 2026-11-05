import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { listItem, titleCard } from '../../../test/job-titles-fixtures';
import { me, server } from '../../../test/msw';
import { N, orgTree } from '../../../test/org-fixtures';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { JobTitlesPage } from './job-titles-page';

beforeEach(() => window.localStorage.clear());

/** Mounts the page against a mocked API; returns the list requests seen. */
function openPage({ keys = [], adminMode = false, items = [listItem(), listItem({ id: 't2', code: null, nameAr: 'مساعد إداري', nameEn: 'Assistant', grade: null, track: null, occupants: 0 })], view = 'table' }: { keys?: string[]; adminMode?: boolean; items?: ReturnType<typeof listItem>[]; view?: 'table' | 'cards' } = {}) {
  window.localStorage.setItem('view:job-titles', view);
  const asked: URLSearchParams[] = [];
  const person = me([CorePermission.JobTitlesView, ...keys].map((key) => ({ key, scope: 'all' as const })), { adminMode });
  server.use(
    http.get('*/api/me', () => HttpResponse.json(person)),
    http.get('*/api/org/tree', () => HttpResponse.json(orgTree())),
    http.get('*/api/org/job-titles', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 });
    }),
    http.get('*/api/org/job-titles/:id/card', () => HttpResponse.json(titleCard())),
  );
  renderPage(<JobTitlesPage />);
  return { asked };
}

describe('The job-titles page (FR-107)', () => {
  it('lists the titles with code, unit, grade, track and holders, and marks a vacant title and one with no code', async () => {
    openPage();
    const row = (await screen.findByText('محاسب')).closest('tr') as HTMLElement;
    expect(within(row).getByText('OPS.03.03.01-L7P-01')).toBeInTheDocument();
    expect(within(row).getByText('وحدة الحسابات')).toBeInTheDocument();
    expect(within(row).getByText('L7')).toBeInTheDocument();
    expect(within(row).getByText('مهني')).toBeInTheDocument();
    const vacant = screen.getByText('مساعد إداري').closest('tr') as HTMLElement;
    expect(within(vacant).getByText('شاغر')).toBeInTheDocument();
    expect(within(vacant).getByText('بلا رمز')).toBeInTheDocument();
  });

  it('searches by name or code and sends it to the API', async () => {
    const { asked } = openPage();
    fireEvent.change(await screen.findByRole('searchbox', { name: 'بحث في المسميات' }), { target: { value: 'L7P' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'L7P')).toBe(true));
  });

  it('offers a filter for every attribute and sends each to the API query', async () => {
    const { asked } = openPage();
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    for (const label of ['القطاع', 'الإدارة', 'القسم', 'الدرجة', 'المسار', 'الشاغر']) expect(await screen.findByLabelText(label)).toBeInTheDocument();
    await chooseOption(screen.getByLabelText('القطاع'), N.sector);
    await chooseOption(screen.getByLabelText('الدرجة'), '7');
    await chooseOption(screen.getByLabelText('المسار'), 'P');
    await chooseOption(screen.getByLabelText('الشاغر'), 'true');
    await waitFor(() => expect(asked.some((p) => p.get('sectorId') === N.sector && p.get('grade') === '7' && p.get('track') === 'P' && p.get('vacant') === 'true')).toBe(true));
  });

  it('sends «has holders» as vacant=false', async () => {
    const { asked } = openPage();
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    await chooseOption(await screen.findByLabelText('الشاغر'), 'false');
    await waitFor(() => expect(asked.some((p) => p.get('vacant') === 'false')).toBe(true));
  });

  it('switches between the table and the cards, and remembers the choice', async () => {
    openPage();
    await screen.findByText('محاسب');
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'بطاقات' }));
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    expect(window.localStorage.getItem('view:job-titles')).toBe('cards');
  });

  it('opens the card on a click anywhere on the row, and from the open-card icon', async () => {
    openPage();
    fireEvent.click((await screen.findAllByText('وحدة الحسابات'))[0] as HTMLElement);
    expect(await screen.findByRole('dialog', { name: 'محاسب' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'فتح البطاقة: محاسب' }));
    expect(await screen.findByRole('dialog', { name: 'محاسب' })).toBeInTheDocument();
  });

  it('marks the first row’s card icon for the welcome tour', async () => {
    openPage();
    const icon = await screen.findByRole('button', { name: 'فتح البطاقة: محاسب' });
    expect(icon.closest('[data-tour="title-card"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'فتح البطاقة: مساعد إداري' }).closest('[data-tour="title-card"]')).toBeNull();
  });
});

describe('The job-titles page: every button needs its key (FR-24)', () => {
  it('gives a person with only the view key the card and nothing else', async () => {
    openPage({ adminMode: true });
    await screen.findByText('محاسب');
    expect(screen.queryByRole('button', { name: 'إضافة مسمى' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تصدير' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'استيراد' })).not.toBeInTheDocument();
    for (const name of [/^تعديل: /, /^حذف: /, /^تعديل المحتوى: /]) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('shows each action only with its own key and only in admin mode', async () => {
    openPage({ keys: [CorePermission.JobTitlesUpdate, CorePermission.OrgTitlesEditContent], adminMode: true });
    expect(await screen.findByRole('button', { name: 'تعديل: محاسب' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعديل المحتوى: محاسب' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^حذف: / })).not.toBeInTheDocument();
  });

  it('hides the editing actions while admin mode is off', async () => {
    openPage({ keys: [CorePermission.JobTitlesUpdate, CorePermission.JobTitlesDelete, CorePermission.JobTitlesCreate], adminMode: false });
    await screen.findByText('محاسب');
    for (const name of [/^تعديل: /, /^حذف: /, 'إضافة مسمى']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('shows export and import with their keys', async () => {
    openPage({ keys: [CorePermission.JobTitlesExport, CorePermission.JobTitlesImport] });
    expect(await screen.findByRole('button', { name: 'تصدير' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'استيراد' })).toBeInTheDocument();
  });

  it('adds a title: first the unit it belongs to, then the same form as the unit’s tab', async () => {
    openPage({ keys: [CorePermission.JobTitlesCreate], adminMode: true });
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة مسمى' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة مسمى وظيفي' });
    expect(within(dialog).getByRole('button', { name: 'التالي' })).toBeDisabled();
    await chooseOption(within(dialog).getByLabelText('الوحدة'), N.unit);
    fireEvent.click(within(dialog).getByRole('button', { name: 'التالي' }));
    expect(await screen.findByRole('dialog', { name: 'إضافة مسميات وظيفية' })).toBeInTheDocument();
    expect(screen.getByLabelText('الدرجة *')).toBeInTheDocument();
    expect(screen.getByLabelText('يرفع إلى')).toBeInTheDocument();
  });

  it('exports the rows of the list (every column checked by default)', async () => {
    openPage({ keys: [CorePermission.JobTitlesExport] });
    fireEvent.click(await screen.findByRole('button', { name: 'تصدير' }));
    const dialog = await screen.findByRole('dialog');
    for (const column of ['الرمز', 'الاسم بالعربي', 'الاسم بالإنجليزي', 'رمز الوحدة', 'الدرجة', 'المسار', 'الشاغلون']) expect(within(dialog).getByLabelText(column)).toBeChecked();
  });
});
