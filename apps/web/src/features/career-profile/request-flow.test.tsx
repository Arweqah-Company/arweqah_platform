import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorePermission, type DevelopmentRequestDto, type MyProgressDto, type RequestPreviewDto } from '@arweqah-platform/shared';
import { me, server } from '../../../test/msw';
import { careerContent, myCareer } from '../../../test/career-fixtures';
import { renderPage } from '../../../test/render';
import { FreeReading } from './free-reading';

const KEYS = [CorePermission.CareerProfileView, CorePermission.CareerLearningUpload, CorePermission.CareerRequestsCreate, CorePermission.CareerLearningExport];
const request = (over: Partial<DevelopmentRequestDto> = {}): DevelopmentRequestDto => ({ id: 'q1', employeeId: 'e1', employeeName: 'منى', courseName: 'إدارة المشاريع', cost: 3000, plan: 'in', status: 'pending', level: 'direct', approverName: 'فهد الدوسري', canDecide: false, overBudget: false, hasAgreement: false, agreementName: null, rejectionReason: null, submittedAt: '2026-11-08T10:00:00.000Z', decidedAt: null, ...over });
const preview = (over: Partial<RequestPreviewDto> = {}): RequestPreviewDto => ({ level: 'direct', approverName: 'فهد الدوسري', budgetCap: 3000, spent: 1800, left: 1200, ...over });
const progress = (): MyProgressDto => ({ requiredDone: [], approvedMinutes: 0, unitsDone: 0, unitsTotal: 2, waiting: 0, badges: [], nextBadge: null, budget: { cap: 3000, spent: 1800 }, competencies: [{ name: 'الاتصال المباشر', required: 'أساسي', mine: 'أساسي', met: true }] });

function open(options: { keys?: string[]; mine?: DevelopmentRequestDto[]; preview?: (cost: number, plan: string) => RequestPreviewDto } = {}) {
  const sent: unknown[] = [];
  const asked: { cost: string | null; plan: string | null }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me((options.keys ?? KEYS).map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/career-profile/me/learning', () => HttpResponse.json([])),
    http.get('*/api/career-profile/me/progress', () => HttpResponse.json(progress())),
    http.get('*/api/career-profile/me/requests/preview', ({ request: r }) => {
      const url = new URL(r.url);
      asked.push({ cost: url.searchParams.get('cost'), plan: url.searchParams.get('plan') });
      return HttpResponse.json(options.preview ? options.preview(Number(url.searchParams.get('cost')), url.searchParams.get('plan') ?? '') : preview());
    }),
    http.get('*/api/career-profile/me/requests', () => HttpResponse.json(options.mine ?? [])),
    http.post('*/api/files', () => HttpResponse.json({ id: 'f1' }, { status: 201 })),
    http.post('*/api/career-profile/me/requests', async ({ request: r }) => { sent.push(await r.json()); return HttpResponse.json(request(), { status: 201 }); }),
  );
  renderPage(<FreeReading content={careerContent} stage={myCareer().stage} />);
  return { sent, asked };
}

const goTo = async (name: string) => fireEvent.click(await screen.findByRole('tab', { name }));
const openDialog = async () => {
  await goTo('خطة التعلم');
  fireEvent.click(await screen.findByRole('button', { name: 'طلب تعلّم من خارج الخطة' }));
  return screen.findByRole('dialog');
};

describe('Development requests: the dialog (FR-116)', () => {
  it('shows who decides and what is left of the budget as soon as a valid cost is typed, and follows the plan choice', async () => {
    const { asked } = open({ preview: (cost, plan) => (cost > 20000 ? preview({ level: 'ceo', approverName: 'الرئيس' }) : plan === 'out' ? preview({ level: 'sector', approverName: 'مدير القطاع' }) : preview()) });
    const dialog = await openDialog();
    expect(within(dialog).queryByText(/يعتمده:/)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '3000' } });
    expect(await within(dialog).findByText(/يعتمده: مدير القطاع/)).toBeInTheDocument(); // «outside the plan» is the default
    expect(within(dialog).getByText(/الباقي من ميزانيتك السنوية: 1,200 ريال/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: /^ضمن خطة التعلم/ }));
    expect(await within(dialog).findByText(/يعتمده: المدير المباشر \(رد خلال 5 أيام عمل\)/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '25000' } });
    expect(await within(dialog).findByText(/يعتمده: الرئيس التنفيذي/)).toBeInTheDocument();
    expect(asked.map((a) => a.cost)).toContain('25000');
  });

  it('warns, without blocking, when the cost is above what is left of the budget', async () => {
    open();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '1500' } });
    expect(await within(dialog).findByText(/التكلفة أكبر من الباقي من ميزانيتك السنوية/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'إرسال الطلب' })).toBeEnabled();
  });

  it('says so when nobody holds the approver post', async () => {
    open({ preview: () => preview({ approverName: null, budgetCap: null, left: null }) });
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '100' } });
    expect(await within(dialog).findByText(/لا أحد يشغل منصب المعتمِد/)).toBeInTheDocument();
    expect(within(dialog).getByText(/لا حدّ لميزانية مرحلتك/)).toBeInTheDocument();
  });

  it('asks for the course and the cost before sending, then sends the agreement file first and the request after it', async () => {
    const { sent } = open();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال الطلب' }));
    expect(within(dialog).getByText('اسم الكورس مطلوب.')).toBeInTheDocument();
    expect(within(dialog).getByText(/التكلفة مطلوبة/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '12.5' } });
    expect(within(dialog).getByText(/التكلفة مطلوبة/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('اسم الكورس'), { target: { value: 'إدارة المشاريع' } });
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '4000' } });
    fireEvent.change(dialog.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['%PDF'], 'agreement.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال الطلب' }));
    await waitFor(() => expect(sent).toEqual([{ courseName: 'إدارة المشاريع', cost: 4000, plan: 'out', agreementFileId: 'f1' }]));
  });

  it('sends a request without an agreement, inside the plan', async () => {
    const { sent } = open();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('اسم الكورس'), { target: { value: 'القيادة' } });
    fireEvent.change(within(dialog).getByLabelText('التكلفة بالريال'), { target: { value: '900' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: /^ضمن خطة التعلم/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال الطلب' }));
    await waitFor(() => expect(sent).toEqual([{ courseName: 'القيادة', cost: 900, plan: 'in' }]));
  });

  it('offers no request button without the create key', async () => {
    open({ keys: [CorePermission.CareerProfileView] });
    await goTo('خطة التعلم');
    await screen.findByText('أمان العمل');
    expect(screen.queryByRole('button', { name: 'طلب تعلّم من خارج الخطة' })).not.toBeInTheDocument();
  });

});

describe('Development requests: my list and the cards (FR-116)', () => {
  it('lists my requests with their state and who decides, and opens the details on a click', async () => {
    open({ mine: [request(), request({ id: 'q2', courseName: 'التفاوض', status: 'rejected', level: 'sector', plan: 'out', rejectionReason: 'خارج الأولويات', overBudget: true })] });
    await goTo('خطة التعلم');
    fireEvent.click(await screen.findByRole('tab', { name: 'طلباتي' }));
    const row = (await screen.findByText('التفاوض')).closest('tr') as HTMLElement;
    expect(within(row).getByText('مرفوض')).toBeInTheDocument();
    expect(within(row).getByText('مدير القطاع')).toBeInTheDocument();
    expect(within(row).getByText('تتجاوز الباقي من الميزانية')).toBeInTheDocument();
    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('خارج الأولويات')).toBeInTheDocument();
  });

  it('shows the budget card and the competencies card with the numbers of the server', async () => {
    open();
    expect(await screen.findByText('الميزانية: 1,800 من 3,000 ريال')).toBeInTheDocument();
    expect(screen.getByText('60٪')).toBeInTheDocument();
    expect(screen.getByText('جدارات مستواك الأساسية محققة')).toBeInTheDocument();
    expect(screen.getByText('1 من 1')).toBeInTheDocument();
  });

  it('shows «my level» and «met» next to each competency on the development tab', async () => {
    open();
    await goTo('التطوير المهني');
    fireEvent.click(await screen.findByRole('tab', { name: 'الجدارات الفنية' }));
    const row = (await screen.findByText('الاتصال المباشر')).closest('tr') as HTMLElement;
    expect(within(row).getByText('محققة')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'مستواي' })).toBeInTheDocument();
  });
});
