import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { step, titleCard } from '../../../test/job-titles-fixtures';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { TitleCardDialog } from './title-card-dialog';

/** Serves the card the dialog asks for, and remembers the `company` it was asked for. */
function serveCard(card: ReturnType<typeof titleCard> | ((company: string | null) => ReturnType<typeof titleCard>), asked: (string | null)[] = []) {
  server.use(http.get('*/api/org/job-titles/:id/card', ({ request }) => {
    const company = new URL(request.url).searchParams.get('company');
    asked.push(company);
    return HttpResponse.json(typeof card === 'function' ? card(company) : card);
  }));
}

const as = (keys: string[], adminMode = false) => server.use(http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const })), { adminMode }))));
const open = () => renderPage(<TitleCardDialog titleId="t1" onClose={() => undefined} />);

describe('The job-title card (FR-107)', () => {
  it('cuts the code into its slots with the grade and track and the sequence, and names a zero «none»', async () => {
    serveCard(titleCard({ codeParts: { unitCode: 'GRW.00.01.00', grade: 5, track: 'M', sequence: 2 }, code: 'GRW.00.01.00-L5M-02' }));
    open();
    const slots = await screen.findByRole('group', { name: 'معنى الرمز' });
    expect(within(slots).getByText('GRW')).toBeInTheDocument();
    expect(within(slots).getByText('قطاع')).toBeInTheDocument();
    expect(within(slots).getAllByText('00')).toHaveLength(2);
    expect(within(slots).getByText('إدارة (لا يوجد)')).toBeInTheDocument();
    expect(within(slots).getByText('وحدة (لا يوجد)')).toBeInTheDocument();
    expect(within(slots).getByText('L5M')).toBeInTheDocument();
    expect(within(slots).getByText('02')).toBeInTheDocument();
  });

  it('writes the grade, the track, the development stage with its hours and budget, and the line it reports to', async () => {
    serveCard(titleCard());
    open();
    expect(await screen.findByText('التخصص: 48 ساعة في السنة، وحد ميزانية 5,000 ريال')).toBeInTheDocument();
    expect(screen.getByText('L7')).toBeInTheDocument();
    expect(screen.getByText('مهني')).toBeInTheDocument();
    expect(screen.getByText(/رئيس الحسابات/)).toBeInTheDocument();
  });

  it('says «HR decides» when no rule covers the grade and track, and never guesses a stage', async () => {
    serveCard(titleCard({ developmentStage: null, developmentStageReason: 'no_rule', grade: 2, track: 'S' }));
    open();
    expect(await screen.findByText(/لا قاعدة لهذه الدرجة والمسار بعد: تحدده الموارد البشرية/)).toBeInTheDocument();
    expect(screen.queryByText(/ساعة في السنة/)).not.toBeInTheDocument();
  });

  it('explains a title with no code yet', async () => {
    serveCard(titleCard({ code: null, codeParts: null, grade: null, track: null, developmentStage: null, developmentStageReason: 'no_grade' }));
    open();
    expect(await screen.findByText(/هذا المسمى بلا رمز بعد/)).toBeInTheDocument();
    expect(screen.getByText('تظهر المرحلة بعد تحديد الدرجة والمسار.')).toBeInTheDocument();
  });

  it('shows an empty state for a title with no content, and the lists when it has some', async () => {
    serveCard(titleCard());
    const first = open();
    expect(await screen.findByText(/لم يُدخل محتوى هذا المسمى بعد/)).toBeInTheDocument();
    first.unmount();
    serveCard(titleCard({ responsibilities: { ar: ['إعداد القوائم'], en: [] }, qualifications: { ar: [], en: ['Bachelor in accounting'] }, kpis: { ar: ['دقة القيود'], en: ['Entry accuracy'] } }));
    open();
    expect(await screen.findByText('إعداد القوائم')).toBeInTheDocument();
    expect(screen.getByText('Bachelor in accounting')).toBeInTheDocument(); // the other language when this one is empty
    expect(screen.getByText('دقة القيود')).toBeInTheDocument();
  });

  it('lists who holds the title in each company, or says it is vacant', async () => {
    serveCard(titleCard());
    const first = open();
    const holders = (await screen.findByRole('heading', { name: 'الشاغلون حسب الشركة' })).closest('section') as HTMLElement;
    expect(within(holders).getByText(/أروقة الريادة/)).toHaveTextContent('3');
    expect(within(holders).getByText(/لدن/)).toHaveTextContent('1');
    first.unmount();
    serveCard(titleCard({ occupants: [], chain: null }));
    open();
    expect(await screen.findByText('شاغر')).toBeInTheDocument();
  });
});

describe('The manager chain of a title (FR-107)', () => {
  it('skips a vacant title, finds the manager with the number of holders, and marks a title outside the company', async () => {
    serveCard(titleCard({ chain: { companyId: 'c1', managerTitleId: 's2', steps: [step({ id: 's1', state: 'vacant' }), step({ id: 's2', nameAr: 'رئيس الحسابات', nameEn: 'Head', state: 'found', count: 2, managerName: 'نورة السبيعي' }), step({ id: 's3', nameAr: 'مدير المالية', state: 'blocked' })] } }));
    open();
    const chain = await screen.findByRole('list', { name: 'سلسلة المدير المباشر' });
    const items = within(chain).getAllByRole('listitem');
    expect(items).toHaveLength(4); // the employee and three titles
    expect(within(chain).getByText('موظف من أروقة الريادة')).toBeInTheDocument();
    expect(items.slice(1).map((i) => i.getAttribute('data-state'))).toEqual(['vacant', 'found', 'blocked']);
    expect(items[1]).toHaveTextContent('شاغر: يُتخطّى');
    expect(items[2]).toHaveTextContent('المدير المباشر: نورة السبيعي (2 شاغل)');
    expect(items[3]).toHaveTextContent('خارج الشركة: لا يتجاوزها البحث');
    expect(screen.queryByText(/تقرير «وحدات بلا قائد»/)).not.toBeInTheDocument();
  });

  it('says the employee goes into the no-leader report when no manager is found', async () => {
    serveCard(titleCard({ chain: { companyId: 'c1', managerTitleId: null, steps: [step({ state: 'vacant' })] } }));
    open();
    expect(await screen.findByText(/لا مدير لهذا الموظف في شركته. يظهر في تقرير «وحدات بلا قائد»/)).toBeInTheDocument();
  });

  it('lets a holder of the full-view key walk the chain for another company', async () => {
    as([CorePermission.JobTitlesView, CorePermission.OrgViewFull]);
    const asked: (string | null)[] = [];
    serveCard((company) => titleCard({ chain: { companyId: company ?? 'c1', managerTitleId: null, steps: [] } }), asked);
    open();
    await chooseOption(await screen.findByLabelText('موظف من شركة'), 'c2');
    await waitFor(() => expect(asked).toContain('c2'));
    expect(await screen.findByText('موظف من لدن')).toBeInTheDocument();
  });

  it('offers no company choice to a person without the full-view key', async () => {
    serveCard(titleCard());
    open();
    await screen.findByRole('heading', { name: 'من هو المدير المباشر؟' });
    expect(screen.queryByLabelText('موظف من شركة')).not.toBeInTheDocument();
  });
});

describe('Editing the content of a title (FR-106)', () => {
  it('shows the edit button only with the content key in admin mode, and saves the lines of both languages', async () => {
    as([CorePermission.JobTitlesView, CorePermission.OrgTitlesEditContent], true);
    serveCard(titleCard());
    const sent: unknown[] = [];
    server.use(http.put('*/api/org/job-titles/:id/content', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ contentVersion: 2 }); }));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل المحتوى' }));
    const dialog = await screen.findByRole('dialog', { name: 'تعديل محتوى المسمى' });
    fireEvent.change(within(dialog).getByLabelText('المسؤوليات: العربية'), { target: { value: 'إعداد القوائم\nمراجعة القيود' } });
    fireEvent.change(within(dialog).getByLabelText('مؤشرات الأداء: English'), { target: { value: 'Entry accuracy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ responsibilities: { ar: ['إعداد القوائم', 'مراجعة القيود'], en: [] }, qualifications: { ar: [], en: [] }, kpis: { ar: [], en: ['Entry accuracy'] } });
  });

  it('hides the button without the key', async () => {
    as([CorePermission.JobTitlesView], true);
    serveCard(titleCard());
    open();
    await screen.findByRole('heading', { name: 'المسؤوليات والمؤهلات والمؤشرات' });
    expect(screen.queryByRole('button', { name: 'تعديل المحتوى' })).not.toBeInTheDocument();
  });
});
