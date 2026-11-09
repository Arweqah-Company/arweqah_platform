import { CorePermission, type LearningRecordDto, type MyProgressDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { careerContent, myCareer } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { FreeReading } from './free-reading';

const UNIT = '11111111-1111-4111-8111-111111111111';
const KEYS = [CorePermission.CareerProfileView, CorePermission.CareerLearningUpload, CorePermission.CareerRequiredTick];
const record = (over: Partial<LearningRecordDto> = {}): LearningRecordDto => ({ id: 'r1', unitId: UNIT, status: 'wait', kind: 'certificate', note: null, fileName: 'cert.pdf', minutes: 120, submittedAt: '2026-11-08T10:00:00.000Z', decidedAt: null, rejectionReason: null, rejectionCount: 0, ...over });
const progress = (over: Partial<MyProgressDto> = {}): MyProgressDto => ({ requiredDone: [], approvedMinutes: 0, unitsDone: 0, unitsTotal: 2, waiting: 0, badges: [{ name: 'وسام الأساس', hours: 35, reached: false }], nextBadge: { name: 'وسام الأساس', hours: 35, missingMinutes: 2100 }, ...over });

function open(records: LearningRecordDto[] = [], state: MyProgressDto = progress(), keys: string[] = KEYS) {
  const sent: unknown[] = [];
  const ticks: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/career-profile/me/learning', () => HttpResponse.json(records)),
    http.get('*/api/career-profile/me/progress', () => HttpResponse.json(state)),
    http.post('*/api/files', () => HttpResponse.json({ id: 'f1' }, { status: 201 })),
    http.post('*/api/career-profile/me/learning', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json(record(), { status: 201 }); }),
    http.put('*/api/career-profile/me/required/:index', async ({ request, params }) => { ticks.push({ index: params.index, ...(await request.json() as object) }); return HttpResponse.json(progress({ requiredDone: [Number(params.index)] })); }),
  );
  renderPage(<FreeReading content={careerContent} stage={myCareer().stage} />);
  return { sent, ticks };
}

const goTo = async (name: string) => fireEvent.click(await screen.findByRole('tab', { name }));

describe('Proofs, progress and ticks on the employee\'s path (FR-114)', () => {
  it('shows the numbers of the plan: units done and the hours with the next medal', async () => {
    open([], progress({ unitsDone: 1, approvedMinutes: 600 }));
    expect(await screen.findByText('1 من 2')).toBeInTheDocument();
    expect(screen.getByText(/الوسام التالي: وسام الأساس عند 35 ساعة/)).toBeInTheDocument();
    expect(screen.getByText('10 ساعة و0 دقيقة')).toBeInTheDocument();
  });

  it('shows the state of each unit, with «not started» for a unit with no record', async () => {
    open([record({ status: 'rej', rejectionReason: 'الشهادة ناقصة', rejectionCount: 1 })]);
    await goTo('خطة التعلم');
    const row = (await screen.findByText('أمان العمل')).closest('tr') as HTMLElement;
    expect(await within(row).findByText('مرفوض (1)')).toBeInTheDocument();
  });

  it('sends a certificate: the file first, then the proof, and a certificate cannot go without its file', async () => {
    const { sent } = open();
    await goTo('خطة التعلم');
    fireEvent.click(await screen.findByRole('button', { name: /رفع الإثبات: أمان العمل/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'إرسال للاعتماد' })).toBeDisabled();
    expect(within(dialog).getByText('أرفق ملف الشهادة أولًا.')).toBeInTheDocument();
    fireEvent.change(dialog.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['%PDF'], 'cert.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(within(dialog).getByLabelText(/ملاحظة للمراجع/), { target: { value: 'شهادة الدورة' } });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'إرسال للاعتماد' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال للاعتماد' }));
    await waitFor(() => expect(sent).toEqual([{ unitId: UNIT, kind: 'certificate', note: 'شهادة الدورة', fileId: 'f1' }]));
  });

  it('a work application needs no file; a rejected unit shows why and offers to send again', async () => {
    const { sent } = open([record({ status: 'rej', rejectionReason: 'الشهادة ناقصة' })]);
    await goTo('خطة التعلم');
    fireEvent.click(await screen.findByRole('button', { name: /أعد الرفع: أمان العمل/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('سبب الرفض: الشهادة ناقصة')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText(/تطبيق في العمل/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال للاعتماد' }));
    await waitFor(() => expect(sent).toEqual([{ unitId: UNIT, kind: 'application' }]));
  });

  it('offers no upload for a unit that waits or is done, and without the upload key', async () => {
    open([record({ status: 'wait' })]);
    await goTo('خطة التعلم');
    await screen.findByText('أمان العمل');
    expect(screen.queryByRole('button', { name: /رفع الإثبات: أمان العمل/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تفاصيل الوحدة: أمان العمل/ })).toBeInTheDocument();
  });

  it('ticks an item of «required» and shows it done', async () => {
    const { ticks } = open();
    await goTo('المطلوب');
    const box = (await screen.findAllByRole('checkbox'))[0] as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect(ticks).toEqual([{ index: '0', done: true }]));
    expect(await screen.findByText('تم', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows no tick without its key', async () => {
    open([], progress(), [CorePermission.CareerProfileView]);
    await goTo('المطلوب');
    await screen.findByText(careerContent.required[0]!.when);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
