import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { CYCLE_KEYS, REMINDERS } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { RemindersList } from './reminders-list';

type Call = { method: string; url: string; body: unknown };

function open(keys: string[] = CYCLE_KEYS) {
  window.localStorage.setItem('view:performance-reminders', 'table');
  const calls: Call[] = [];
  const record = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: request.method === 'DELETE' ? null : await request.json() }); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.post('*/api/performance/cycle/reminders', async ({ request }) => { await record(request); return HttpResponse.json({ id: 'new', ...(calls.at(-1)!.body as object) }, { status: 201 }); }),
    http.put('*/api/performance/cycle/reminders/:id', async ({ request }) => { await record(request); return HttpResponse.json(REMINDERS[0]); }),
    http.delete('*/api/performance/cycle/reminders/:id', async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<RemindersList reminders={REMINDERS} />);
  return { calls };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'success').mockReturnValue(1);
  vi.spyOn(toast, 'error').mockReturnValue(1);
});

describe('The automatic reminders list (FR-124, plan §3.7ج)', () => {
  it('lists every reminder with its kind, when it comes, its title and whether it is on, and the note under the list', async () => {
    open();
    const table = await screen.findByRole('table', { name: 'التذكيرات التلقائية' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4); // the header and three reminders
    expect(within(rows[1]!).getByText('الموظف: التقييم الذاتي')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('قبل آخر موعد بـ 7، 3، 1 أيام')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('تذكير بالتقييم الذاتي')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('كل 2 أيام')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('متوقف')).toBeInTheDocument();
    expect(screen.getByText('تصل التذكيرات بإشعار داخلي وبريد، وتتوقف عند الإنجاز. لا تُرسل في عطلة نهاية الأسبوع.')).toBeInTheDocument();
  });

  it('searches the titles and the texts, and filters by kind and by state', async () => {
    open();
    await screen.findByRole('table', { name: 'التذكيرات التلقائية' });
    fireEvent.change(screen.getByPlaceholderText('ابحث في العناوين والنصوص'), { target: { value: 'محطة' } });
    await waitFor(() => expect(screen.queryByText('تذكير بالتقييم الذاتي')).not.toBeInTheDocument());
    expect(screen.getByText('محطة قريبة')).toBeInTheDocument();
  });

  it('adds a reminder with its own words: says what is wrong as it is typed, then sends it', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة تذكير' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'إضافة تذكير' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('العنوان بالعربية *'), { target: { value: 'ab' } });
    expect(within(dialog).getByText('اكتب 3 أحرف على الأقل.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('قبل آخر موعد بـ (أيام، مفصولة بفواصل) *'), { target: { value: '31' } });
    expect(within(dialog).getByText('أيام الموظف من 1 إلى 30 (حتى 10 أيام)، مفصولة بفواصل.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(calls).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText('قبل آخر موعد بـ (أيام، مفصولة بفواصل) *'), { target: { value: '١٠، ٥، ٢' } }); // Arabic digits and comma
    fireEvent.change(within(dialog).getByLabelText('العنوان بالعربية *'), { target: { value: 'تذكير مخصص' } });
    fireEvent.change(within(dialog).getByLabelText('النص بالعربية *'), { target: { value: 'أرسل تقييمك قبل الموعد' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/api/performance/cycle/reminders', body: { kind: 'self', on: true, days: [10, 5, 2], titleAr: 'تذكير مخصص', titleEn: '', bodyAr: 'أرسل تقييمك قبل الموعد', bodyEn: '' } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('أُضيف التذكير.'));
  });

  it('asks for one number of days for the kinds that repeat or count from a date, and refuses a list or a number out of range', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة تذكير' }));
    const dialog = await screen.findByRole('dialog');
    await chooseOption(within(dialog).getByLabelText('النوع'), 'mgr');
    const days = within(dialog).getByLabelText('كل (أيام) *');
    fireEvent.change(days, { target: { value: '15' } });
    expect(within(dialog).getByText('اكتب رقمًا من 1 إلى 14.')).toBeInTheDocument();
    fireEvent.change(days, { target: { value: '3' } });
    expect(within(dialog).queryByText('اكتب رقمًا من 1 إلى 14.')).not.toBeInTheDocument();
    await chooseOption(within(dialog).getByLabelText('النوع'), 'mile');
    expect(within(dialog).getByLabelText('قبل الموعد بـ (أيام) *')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

});

describe('Changing, switching and deleting reminders (FR-124)', () => {
  it('changes a reminder: the dialog starts with what it holds and the change is sent to its own address', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل التذكير: تذكير بالتقييم الذاتي' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'تعديل تذكير' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('العنوان بالعربية *')).toHaveValue('تذكير بالتقييم الذاتي');
    expect(within(dialog).getByLabelText('العنوان بالإنجليزية')).toHaveValue('Self-evaluation reminder');
    fireEvent.change(within(dialog).getByLabelText('العنوان بالعربية *'), { target: { value: 'تذكير معدّل' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/api/performance/cycle/reminders/r1', body: { kind: 'self', on: true, days: [7, 3, 1], titleAr: 'تذكير معدّل', titleEn: 'Self-evaluation reminder', bodyAr: 'لم ترسل تقييمك الذاتي بعد.', bodyEn: 'You have not sent your self-evaluation yet.' } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('حُفظ التذكير.'));
  });

  it('opens the reminder when its row is clicked, and switches one on or off from its row without opening anything', async () => {
    const { calls } = open();
    await screen.findByRole('button', { name: 'إضافة تذكير' }); // the keys have arrived
    fireEvent.click(screen.getByText('تقييم ينتظر مراجعتك'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل التذكير: محطة قريبة' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url.endsWith('/r3') && (c.body as { on: boolean }).on)).toBe(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes a reminder only after a confirmation', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف التذكير: محطة قريبة' }));
    expect(calls).toHaveLength(0);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف التذكير' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', url: '/api/performance/cycle/reminders/r3', body: null }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('حُذف التذكير.'));
  });

  it('tells the person when saving or deleting fails', async () => {
    open();
    server.use(http.put('*/api/performance/cycle/reminders/:id', () => HttpResponse.json({ code: 'x', message: 'x' }, { status: 500 })), http.delete('*/api/performance/cycle/reminders/:id', () => HttpResponse.json({ code: 'x', message: 'x' }, { status: 500 })));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل التذكير: تذكير بالتقييم الذاتي' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('تعذّر حفظ التذكير.')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إلغاء' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حذف التذكير: محطة قريبة' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف التذكير' }));
    expect(await screen.findByText('تعذّر حذف التذكير.')).toBeInTheDocument();
  });

  it('shows the list and nothing to change to someone without the key', async () => {
    open([CorePermission.PerformanceCycleView]);
    await screen.findByRole('table', { name: 'التذكيرات التلقائية' });
    for (const name of ['إضافة تذكير', /تعديل التذكير/, /حذف التذكير/, /إيقاف التذكير|تشغيل التذكير/]) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('تقييم ينتظر مراجعتك'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
