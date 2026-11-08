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

const pick = async (name: string) => fireEvent.click(await screen.findByRole('button', { name: (accessible) => accessible.includes(name) }));

describe('The career-path content page (FR-113)', () => {
  it('reads the list again after a path is set ready, so the title shows its new state at once', async () => {
    let status: 'draft' | 'ready' = 'draft';
    open(ALL, [careerRow()]);
    server.use(
      http.get('*/api/career/titles', () => HttpResponse.json({ items: [careerRow({ status })], total: 1, page: 1, pageSize: 20 })),
      http.post('*/api/career/titles/t1/publish', () => { status = 'ready'; return HttpResponse.json({}); }),
    );
    expect(await screen.findByText('مسودة: لا يراها الموظف')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /تعيين المسار جاهزًا/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'تعيين جاهزًا' }));
    expect(await screen.findByText('جاهز: ظاهر لشاغليه')).toBeInTheDocument();
  });

  it('lists the titles with their code and the state of their path, and opens the first one in its panel with its version', async () => {
    open();
    expect(await screen.findByRole('button', { name: /منسق الاستقطاب/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /مساعد إداري.*بلا محتوى/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /محاسب.*جاهز/ })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'منسق الاستقطاب' })).toBeInTheDocument();
    expect(screen.getByText('إصدار المحتوى 2')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'أقسام المسار' })).getByText('OPS.01.01.01-L9P-01')).toBeInTheDocument();
  });

  it('shows in the panel only the actions the state of the title allows and the person\'s keys give', async () => {
    open();
    expect(await screen.findByRole('button', { name: /تعيين المسار جاهزًا/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إرجاع المسار إلى مسودة/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إعادة فتح الإقرار/ })).not.toBeInTheDocument();
    await pick('محاسب');
    expect(await screen.findByRole('button', { name: /إرجاع المسار إلى مسودة/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة فتح الإقرار لشاغلي المسمى \(3\)/ })).toBeInTheDocument();
    await pick('مساعد إداري');
    expect(await screen.findByRole('button', { name: /رفع ملف المسمى/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تعيين المسار جاهزًا/ })).not.toBeInTheDocument();
  });

  it('hides every action and the editors from a person who only sees the page', async () => {
    open([CorePermission.CareerContentView]);
    await screen.findByRole('heading', { level: 3, name: 'منسق الاستقطاب' });
    for (const name of [/معاينة المسار/, /رفع ملف المسمى/, /تعيين المسار جاهزًا/, /حفظ التعديلات/]) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('searches and filters in the API query: the path state, the grade and the track', async () => {
    const { asked } = open();
    await screen.findByRole('button', { name: /منسق الاستقطاب/ });
    fireEvent.change(screen.getByPlaceholderText('ابحث بالمسمى أو الرمز'), { target: { value: 'منسق' } });
    await waitFor(() => expect(asked.some((p) => p.get('search') === 'منسق')).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    await chooseOption(await screen.findByLabelText('حالة المسار'), 'ready');
    await chooseOption(screen.getByLabelText('الدرجة'), '9');
    await chooseOption(screen.getByLabelText('المسار'), 'P');
    await waitFor(() => expect(asked.some((p) => p.get('status') === 'ready' && p.get('grade') === '9' && p.get('track') === 'P')).toBe(true));
  });
});

describe('The career-path content page: dialogs of the panel (FR-113)', () => {
  it('previews the path from its icon, and confirms before setting a path ready, with the holders it reaches', async () => {
    const { posted } = open();
    fireEvent.click(await screen.findByRole('button', { name: /معاينة المسار/ }));
    expect(await screen.findByText('معاينة المسار الوظيفي: منسق الاستقطاب')).toBeInTheDocument();
    expect((await screen.findAllByText(careerContent.summary)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'إغلاق' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: /تعيين المسار جاهزًا/ }));
    expect(await screen.findByText(/سيظهر المسار لشاغلي المسمى \(3\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تعيين جاهزًا' }));
    await waitFor(() => expect(posted.map((p) => p.url)).toContain('/api/career/titles/t1/publish'));
  });

  it('asks for a reason of five characters before reopening the acknowledgement', async () => {
    const { posted } = open();
    await pick('محاسب');
    fireEvent.click(await screen.findByRole('button', { name: /إعادة فتح الإقرار/ }));
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
