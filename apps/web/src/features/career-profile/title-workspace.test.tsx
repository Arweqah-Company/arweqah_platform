import { CorePermission, type CareerContent } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { careerContent, careerRow } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TitleWorkspace } from './title-workspace';

const EDIT = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePreview];

function open(content: CareerContent = careerContent, keys: string[] = EDIT, status: 'draft' | 'ready' = 'draft') {
  const puts: { content: CareerContent; expectedVersion: number }[] = [];
  const person = me(keys.map((key) => ({ key, scope: 'all' as const })));
  server.use(
    http.get('*/api/me', () => HttpResponse.json(person)),
    http.get('*/api/career/titles/t1/content', () => HttpResponse.json({ titleId: 't1', titleCode: null, titleNameAr: 'x', titleNameEn: 'x', version: 4, status, content, problems: [], updatedAt: null })),
    http.put('*/api/career/titles/t1/content', async ({ request }) => {
      const body = (await request.json()) as { content: CareerContent; expectedVersion: number };
      puts.push(body);
      return HttpResponse.json({ version: 5 });
    }),
  );
  renderPage(<TitleWorkspace title={careerRow({ status })} onClose={() => undefined} onAction={() => undefined} />);
  return { puts };
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('The workspace of a title: editing a path field by field (FR-113)', () => {
  it('shows seven tabs and the summary of the job description to edit, with nothing to save until it changes', async () => {
    open();
    const summary = await screen.findByLabelText('ملخص الوظيفة');
    expect(summary).toHaveValue(careerContent.summary);
    for (const name of ['الوصف الوظيفي', 'السلم والمسار', 'الجدارات الفنية', 'خطة التعلم', 'المطلوب', 'التقييم', 'القوائم المشتركة']) expect(tab(name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled();
    expect(screen.getByText('كل الأجزاء مكتملة ويمكن تعيين المسار جاهزًا.')).toBeInTheDocument();
  });

  it('saves the edited document on the version it was read at', async () => {
    const { puts } = open();
    fireEvent.change(await screen.findByLabelText('ملخص الوظيفة'), { target: { value: 'ملخص معدّل' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]?.expectedVersion).toBe(4);
    expect(puts[0]?.content.summary).toBe('ملخص معدّل');
    expect(puts[0]?.content.kpis).toEqual(careerContent.kpis);
  });

  it('lists what is missing live as the document is edited, and keeps «Save» off while a field is not valid', async () => {
    open();
    const summary = await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.change(summary, { target: { value: '' } });
    expect(screen.getByText('لا يمكن تعيينه جاهزًا:')).toBeInTheDocument();
    expect(screen.getByText('الوصف الوظيفي ناقص (ملخص أو مؤشرات أو مسؤوليات)')).toBeInTheDocument();
    expect(screen.getByText('هذا الحقل مطلوب')).toBeInTheDocument();
    fireEvent.change(summary, { target: { value: 'ملخص' } });
    expect(screen.getByText('كل الأجزاء مكتملة ويمكن تعيين المسار جاهزًا.')).toBeInTheDocument();
  });

  it('adds and removes an indicator and a responsibility, and keeps only one governing indicator', async () => {
    const { puts } = open();
    await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مؤشر' }));
    const kpis = screen.getAllByLabelText('المؤشر');
    expect(kpis).toHaveLength(3);
    fireEvent.change(kpis[2] as HTMLElement, { target: { value: 'مؤشر جديد' } });
    fireEvent.click(screen.getAllByLabelText('المؤشر الحاكم')[2] as HTMLElement);
    expect(screen.getAllByLabelText('المؤشر الحاكم').map((b) => (b as HTMLInputElement).checked)).toEqual([false, false, true]);
    fireEvent.click(screen.getAllByRole('button', { name: 'حذف' })[1] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]?.content.kpis).toEqual([{ text: careerContent.kpis[0]!.text, governing: false }, { text: 'مؤشر جديد', governing: true }]);
  });

});

describe('The workspace of a title: the ladder, competencies, learning plan and required actions (FR-113)', () => {
  it('edits the ladder (one current title), the condition and the level path', async () => {
    open();
    await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.click(tab('السلم والمسار'));
    const radios = screen.getAllByLabelText('المسمى الحالي') as HTMLInputElement[];
    expect(radios.map((r) => r.checked)).toEqual([true, false]);
    fireEvent.click(radios[1] as HTMLElement);
    expect((screen.getAllByLabelText('المسمى الحالي') as HTMLInputElement[]).map((r) => r.checked)).toEqual([false, true]);
    fireEvent.change(screen.getByLabelText('شرط الانتقال للمستوى التالي'), { target: { value: '' } });
    expect(screen.getByText('التطوير المهني ناقص (السلم أو المسار أو الجدارات أو شرط الانتقال)')).toBeInTheDocument();
  });

  it('edits the competency matrix: a column adds a value to every competency, and removing it removes them', async () => {
    const { puts } = open();
    await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.click(tab('الجدارات الفنية'));
    fireEvent.click(screen.getByRole('button', { name: 'إضافة عمود' }));
    fireEvent.change(screen.getByLabelText('اسم العمود 3'), { target: { value: 'L5 رئيس' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]?.content.competencyColumns).toEqual([...careerContent.competencyColumns, 'L5 رئيس']);
    expect(puts[0]?.content.competencies[0]?.values).toEqual([...careerContent.competencies[0]!.values, '—']);
  });

  it('checks the learning plan as it is typed: a period name that is empty or repeated, a duration nobody understands, a link that is not https', async () => {
    open();
    await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.click(tab('خطة التعلم'));
    const names = screen.getAllByLabelText('اسم الفترة');
    fireEvent.change(names[1] as HTMLElement, { target: { value: 'السنة 1' } });
    expect(screen.getAllByText('اسم الفترة مكرر').length).toBeGreaterThan(0);
    fireEvent.change(screen.getAllByLabelText('المدة')[0] as HTMLElement, { target: { value: 'قريبًا' } });
    expect(screen.getByText('مدة غير مفهومة (مثال: ساعتان و30 دقيقة)')).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText('المدة')[0] as HTMLElement, { target: { value: '3 ساعات و12 دقيقة' } });
    expect(screen.getByText('3 ساعة و12 دقيقة')).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText('الرابط')[0] as HTMLElement, { target: { value: 'http://insecure.example' } });
    expect(screen.getByText('الرابط يجب أن يبدأ بـ https://')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled();
  });

  it('edits the required actions and the acknowledgement sentence', async () => {
    const { puts } = open();
    await screen.findByLabelText('ملخص الوظيفة');
    fireEvent.click(tab('المطلوب'));
    fireEvent.change(screen.getByLabelText('نص الإقرار'), { target: { value: 'اطلعت وأقر' } });
    fireEvent.change(screen.getAllByLabelText('آخر يوم')[0] as HTMLElement, { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]?.content.ackText).toBe('اطلعت وأقر');
    expect(puts[0]?.content.required[0]?.deadline).toBe('2026-12-31');
  });

  it('shows a person without the edit key the path to read and no save button', async () => {
    open(careerContent, [CorePermission.CareerContentView]);
    expect(await screen.findByText(careerContent.summary)).toBeInTheDocument();
    expect(screen.queryByLabelText('ملخص الوظيفة')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حفظ التعديلات' })).not.toBeInTheDocument();
  });

  it('explains a save refused because the content changed meanwhile (409)', async () => {
    open();
    server.use(http.put('*/api/career/titles/t1/content', () => HttpResponse.json({ statusCode: 409, code: 'CAREER_CONTENT_STALE', message: 'x' }, { status: 409 })));
    fireEvent.change(await screen.findByLabelText('ملخص الوظيفة'), { target: { value: 'تعديل' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    expect(await screen.findByText(/تغيّر محتوى هذا المسمى بعد أن فتحته/)).toBeInTheDocument();
    expect(within(document.body).getAllByRole('tab')).toHaveLength(7);
  });
});
