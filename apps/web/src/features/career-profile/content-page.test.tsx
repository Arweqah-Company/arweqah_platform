import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { careerContent, careerRow } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { orgTree } from '../../../test/org-fixtures';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { CareerContentPage } from './content-page';

beforeEach(() => window.localStorage.clear());

const ALL = [CorePermission.CareerContentView, CorePermission.CareerTitlefilePreview, CorePermission.CareerTitlefileUpload, CorePermission.CareerTitlefilePublish, CorePermission.CareerAcknowledgeReopen, CorePermission.CareerContentExport, CorePermission.CareerContentImport];

function open(keys: string[] = ALL, items = [careerRow(), careerRow({ id: 't2', code: null, nameAr: 'مساعد إداري', nameEn: 'Assistant', grade: null, track: null, status: 'none', version: 0, holders: 0 }), careerRow({ id: 't3', nameAr: 'محاسب', nameEn: 'Accountant', status: 'ready' })]) {
  window.localStorage.setItem('view:career-content', 'table');
  const asked: URLSearchParams[] = [];
  const posted: { url: string; body: unknown }[] = [];
  const person = me(keys.map((key) => ({ key, scope: 'all' as const })));
  server.use(
    http.get('*/api/me', () => HttpResponse.json(person)),
    http.get('*/api/org/tree', () => HttpResponse.json(orgTree())),
    http.get('*/api/career/titles', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 });
    }),
    http.get('*/api/career/titles/:id/content', () => HttpResponse.json({ titleId: 't1', titleCode: null, titleNameAr: 'x', titleNameEn: 'x', version: 2, status: 'draft', content: careerContent, problems: [], updatedAt: null })),
    http.post('*/api/career/titles/:id/*', async ({ request }) => {
      posted.push({ url: new URL(request.url).pathname, body: await request.json() });
      return HttpResponse.json({ affected: 3, dryRun: true, saved: false, version: null, counts: {}, problems: [], codeInFile: null, ignored: [] });
    }),
  );
  renderPage(<CareerContentPage />);
  return { asked, posted };
}

describe('The career-path content page (FR-113)', () => {
  it('reads the list again after a path is set ready, so the row shows its new state at once', async () => {
    let status: 'draft' | 'ready' = 'draft';
    open(ALL, [careerRow()]);
    server.use(
      http.get('*/api/career/titles', () => HttpResponse.json({ items: [careerRow({ status })], total: 1, page: 1, pageSize: 20 })),
      http.post('*/api/career/titles/t1/publish', () => { status = 'ready'; return HttpResponse.json({}); }),
    );
    const row = (await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement;
    expect(within(row).getByText('مسودة')).toBeInTheDocument();
    fireEvent.click(await within(row).findByRole('button', { name: /تعيين المسار جاهزًا/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'تعيين جاهزًا' }));
    expect(await within((await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement).findByText('جاهز')).toBeInTheDocument();
  });

  it('lists the titles with the state of their path, the unit, grade, track and holders', async () => {
    open();
    const row = (await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement;
    expect(within(row).getByText('مسودة')).toBeInTheDocument();
    expect(within(row).getByText('وحدة الاستقطاب')).toBeInTheDocument();
    expect(within(row).getByText('L9')).toBeInTheDocument();
    expect(within(row).getByText('مهني')).toBeInTheDocument();
    expect(within((screen.getByText('مساعد إداري').closest('tr')) as HTMLElement).getByText('بلا محتوى')).toBeInTheDocument();
    expect(within((screen.getByText('محاسب').closest('tr')) as HTMLElement).getByText('جاهز')).toBeInTheDocument();
  });

  it('shows on each row only the actions its state allows and the person\'s keys give', async () => {
    open();
    const draft = (await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement;
    expect(await within(draft).findByRole('button', { name: /تعيين المسار جاهزًا/ })).toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: /إرجاع المسار إلى مسودة/ })).not.toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: /إعادة فتح الإقرار/ })).not.toBeInTheDocument();
    const ready = screen.getByText('محاسب').closest('tr') as HTMLElement;
    expect(within(ready).getByRole('button', { name: /إرجاع المسار إلى مسودة/ })).toBeInTheDocument();
    expect(within(ready).getByRole('button', { name: /إعادة فتح الإقرار/ })).toBeInTheDocument();
    const none = screen.getByText('مساعد إداري').closest('tr') as HTMLElement;
    expect(within(none).queryByRole('button', { name: /تعيين المسار جاهزًا/ })).not.toBeInTheDocument();
    expect(within(none).getByRole('button', { name: /رفع ملف المسمى/ })).toBeInTheDocument();
  });

  it('hides every action from a person who only sees the list', async () => {
    open([CorePermission.CareerContentView]);
    const row = (await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement;
    expect(within(row).queryAllByRole('button')).toHaveLength(0);
  });

  it('searches and filters in the API query: the path state, the grade and the track', async () => {
    const { asked } = open();
    await screen.findByText('منسق الاستقطاب');
    fireEvent.change(screen.getByPlaceholderText('ابحث بالمسمى أو الرمز'), { target: { value: 'منسق' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'منسق')).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    await chooseOption(await screen.findByLabelText('حالة المسار'), 'ready');
    await chooseOption(screen.getByLabelText('الدرجة'), '9');
    await chooseOption(screen.getByLabelText('المسار'), 'P');
    await waitFor(() => expect(asked.some((p) => p.get('status') === 'ready' && p.get('grade') === '9' && p.get('track') === 'P')).toBe(true));
  });

});

describe('The career-path content page: dialogs of a row (FR-113)', () => {
  it('opens the workspace on a click on the row and the preview from its icon, and confirms before setting a path ready, with the holders it reaches', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByText('منسق الاستقطاب'));
    expect(await screen.findByText('مساحة عمل المسار: منسق الاستقطاب')).toBeInTheDocument(); // a click on the row opens the workspace
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'إغلاق' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(await within((await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement).findByRole('button', { name: /معاينة المسار/ }));
    expect(await screen.findByText('معاينة المسار الوظيفي: منسق الاستقطاب')).toBeInTheDocument();
    expect(await screen.findByText(careerContent.summary)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'إغلاق' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const draft = (await screen.findByText('منسق الاستقطاب')).closest('tr') as HTMLElement;
    fireEvent.click(await within(draft).findByRole('button', { name: /تعيين المسار جاهزًا/ }));
    expect(await screen.findByText(/سيظهر المسار لشاغلي المسمى \(3\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تعيين جاهزًا' }));
    await waitFor(() => expect(posted.map((p) => p.url)).toContain('/api/career/titles/t1/publish'));
  });

  it('asks for a reason of five characters before reopening the acknowledgement', async () => {
    const { posted } = open();
    const ready = (await screen.findByText('محاسب')).closest('tr') as HTMLElement;
    fireEvent.click(await within(ready).findByRole('button', { name: /إعادة فتح الإقرار/ }));
    const confirm = await screen.findByRole('button', { name: 'تأكيد' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'ق' } });
    expect(screen.getByText('اكتب سببًا من 5 أحرف على الأقل.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('السبب *'), { target: { value: 'تغيّر الوصف الوظيفي' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(posted).toContainEqual({ url: '/api/career/titles/t3/reopen-acknowledgement', body: { reason: 'تغيّر الوصف الوظيفي' } }));
  });
});
