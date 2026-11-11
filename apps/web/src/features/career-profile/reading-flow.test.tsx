import { CorePermission } from '@arweqah-platform/shared';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { careerContent, myCareer } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { MyCareerPage } from './my-career-page';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

/** A browser that tells the test when the reader reaches the end of a section. */
class FakeObserver {
  static all = new Set<FakeObserver>();
  constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) { FakeObserver.all.add(this); }
  observe() {}
  unobserve() {}
  disconnect() { FakeObserver.all.delete(this); }
  static reachEnd() { act(() => FakeObserver.all.forEach((o) => o.callback([{ isIntersecting: true }]))); }
}

beforeEach(() => {
  FakeObserver.all.clear();
  Object.defineProperty(window, 'IntersectionObserver', { value: FakeObserver, configurable: true, writable: true });
  window.scrollTo = () => undefined;
});
afterEach(() => { Reflect.deleteProperty(window, 'IntersectionObserver'); });

function open(profile = myCareer()) {
  const posted: unknown[] = [];
  const person = me([CorePermission.CareerProfileView, CorePermission.CareerAcknowledgeCreate].map((key) => ({ key, scope: 'all' as const })));
  server.use(
    http.get('*/api/me', () => HttpResponse.json(person)),
    http.get('*/api/career-profile/me', () => HttpResponse.json(profile)),
    http.get('*/api/career-profile/me/requests', () => HttpResponse.json([])),
    http.post('*/api/career-profile/me/acknowledge', async ({ request }) => {
      posted.push(await request.json());
      return HttpResponse.json(myCareer({ ackRequired: false, ackReason: null, acknowledgedVersion: 3, acknowledgedAt: '2026-11-08T10:00:00.000Z' }));
    }),
  );
  renderPage(<MyCareerPage />);
  return { posted };
}

/** Opens tabs inside a section, one after the other, the way a reader does. */
const openTabs = (...names: string[]) => names.forEach((name) => fireEvent.click(screen.getByRole('tab', { name: (accessible) => accessible.startsWith(name) })));

const tab = (name: string) => screen.getByRole('tab', { name: (accessible) => accessible.includes(name) });

describe('Reading the career path in order before acknowledging it (FR-112, decision 245)', () => {
  it('opens only the first section, with the other tabs locked and the acknowledgement box off', async () => {
    open();
    expect(await screen.findByText('أول دخول لك.')).toBeInTheDocument();
    expect(screen.getByText(careerContent.summary)).toBeInTheDocument();
    expect(tab('الوصف الوظيفي')).toHaveAttribute('aria-selected', 'true');
    for (const locked of ['تقييم الأداء', 'التطوير المهني', 'خطة التعلم', 'المطلوب', 'الإقرار']) expect(tab(locked)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'أقرّ وأتابع' })).toBeDisabled();
  });

  it('does not hand what `window.scrollTo` returns to React as the clean-up of the page (a scroll library or an extension may return a value, and React then calls it when the page is removed)', async () => {
    const problems = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.scrollTo = (() => Promise.resolve()) as unknown as typeof window.scrollTo; // a replaced scrollTo that answers with something
    open();
    await screen.findByText(careerContent.summary);
    cleanup(); // the page is removed (the employee acknowledges or leaves): React runs the clean-ups, and a value that is not a function used to throw «is not a function» here
    const said = problems.mock.calls.flat().map(String).join(' ');
    expect(said).not.toMatch(/must not return anything besides a function|is not a function/);
    problems.mockRestore();
  });

  it('draws «Previous» with the arrow that points right and «Next» with the one that points left in Arabic (no mirroring on top of them)', async () => {
    open();
    await screen.findByText(careerContent.summary);
    expect(document.querySelector('svg[class*="rtl:-scale-x-100"]')).toBeNull();
  });

  it('explains a click on a locked tab and does not open it', async () => {
    open();
    await screen.findByText(careerContent.summary);
    fireEvent.click(tab('التطوير المهني'));
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('اقرأ الأقسام بالترتيب'));
    expect(tab('الوصف الوظيفي')).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps «Next» off until the end of the section was reached, then opens the next section and marks the read one', async () => {
    open();
    await screen.findByText(careerContent.summary);
    const next = screen.getByRole('button', { name: /التالي: تقييم الأداء/ });
    expect(next).toBeDisabled();
    expect(screen.getByText('مرّر حتى آخر القسم ليُفعَّل «التالي»')).toBeInTheDocument();
    FakeObserver.reachEnd();
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(tab('تقييم الأداء')).toHaveAttribute('aria-selected', 'true');
    expect(tab('التطوير المهني')).toHaveAttribute('aria-disabled', 'true');
    expect(tab('الوصف الوظيفي')).toHaveAttribute('aria-disabled', 'false');
  });

  it('enables the acknowledgement only on the last step, and records the version that was read', async () => {
    const { posted } = open();
    await screen.findByText(careerContent.summary);
    for (let i = 0; i < 5; i++) {
      if (i === 2) openTabs('مسار المستوى', 'الجدارات الفنية');
      if (i === 3) openTabs('الأوسمة', 'طلباتي', 'وحدات التعلم', 'السنة 2');
      FakeObserver.reachEnd();
      fireEvent.click(await screen.findByRole('button', { name: /^التالي/ }));
    }
    expect(await screen.findByText('أنهيتَ قراءة الأقسام الخمسة. بقيت خطوة واحدة: الإقرار.')).toBeInTheDocument();
    const box = screen.getByRole('checkbox');
    expect(box).toBeEnabled();
    const send = screen.getByRole('button', { name: 'أقرّ وأتابع' });
    expect(send).toBeDisabled();
    fireEvent.click(box);
    fireEvent.click(send);
    await screen.findByRole('tab', { name: careerContent.learning.periods[0]!.name }).catch(() => undefined);
    expect(await screen.findByText('أقررتَ بإصدار المحتوى 3')).toBeInTheDocument();
    expect(posted).toEqual([{ contentVersion: 3 }]);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });


});

describe('Opening every tab of a section before «Next» works (FR-112)', () => {
  /** Goes to the section by pressing «Next» as far as it, scrolling to the end of each section before it. */
  async function goTo(section: 'development' | 'learning') {
    await screen.findByText(careerContent.summary);
    const steps = section === 'development' ? 2 : 3;
    for (let i = 0; i < steps; i++) {
      if (i === 2) openTabs('مسار المستوى', 'الجدارات الفنية');
      FakeObserver.reachEnd();
      fireEvent.click(await screen.findByRole('button', { name: /^التالي/ }));
    }
  }

  it('keeps «Next» off in the development section until all three sub-tabs were opened, and says which are left', async () => {
    open();
    await goTo('development');
    FakeObserver.reachEnd();
    const next = screen.getByRole('button', { name: /^التالي/ });
    expect(next).toBeDisabled();
    expect(screen.getByText(/افتح كل التبويبات في هذا القسم قبل المتابعة. بقي: مسار المستوى والجدارات الفنية/)).toBeInTheDocument();
    openTabs('مسار المستوى');
    expect(screen.getByText(/بقي: الجدارات الفنية$/)).toBeInTheDocument();
    expect(next).toBeDisabled();
    openTabs('الجدارات الفنية');
    expect(screen.queryByText(/افتح كل التبويبات/)).not.toBeInTheDocument();
    expect(next).toBeEnabled();
  });

  it('asks for every sub-tab and every year of the learning plan before «Next» works there', async () => {
    open();
    await goTo('learning');
    FakeObserver.reachEnd();
    const next = screen.getByRole('button', { name: /^التالي/ });
    expect(next).toBeDisabled();
    expect(screen.getByText(/بقي: السنة 2 والأوسمة وطلباتي/)).toBeInTheDocument();
    openTabs('الأوسمة', 'طلباتي');
    expect(screen.getByText(/بقي: السنة 2$/)).toBeInTheDocument();
    openTabs('وحدات التعلم', 'السنة 2');
    expect(next).toBeEnabled();
  });

  it('remembers what was opened: going back to a section and forward again does not ask again', async () => {
    open();
    await goTo('development');
    openTabs('مسار المستوى', 'الجدارات الفنية');
    FakeObserver.reachEnd();
    fireEvent.click(screen.getByRole('button', { name: /^التالي/ }));
    fireEvent.click(await screen.findByRole('button', { name: /السابق/ }));
    expect(await screen.findByRole('button', { name: /^التالي/ })).toBeEnabled();
  });

  it('does not ask for any tab outside the reading: the path of an acknowledged person is free', async () => {
    open(myCareer({ ackRequired: false, ackReason: null, acknowledgedVersion: 3 }));
    await screen.findByText('المؤشر الحاكم');
    expect(screen.queryByText(/افتح كل التبويبات/)).not.toBeInTheDocument();
  });

});

describe('The career path page once acknowledged (FR-111)', () => {
  it('opens the five sections in any order once acknowledged, with their content', async () => {
    open(myCareer({ ackRequired: false, ackReason: null, acknowledgedVersion: 3 }));
    expect(await screen.findByText('المؤشر الحاكم')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'التطوير المهني' }));
    // the stage of the grade and track, then three sub-tabs; the ladder shows the person where they stand
    expect(screen.getByText('مرحلة التطوير (من الدرجة والمسار)')).toBeInTheDocument();
    expect(screen.getByText('3,000 ريال')).toBeInTheDocument();
    expect(screen.getByText('أنت هنا')).toBeInTheDocument();
    expect(screen.getByText('المستوى التالي ↑')).toBeInTheDocument();
    expect(screen.getByText(careerContent.transitionRule, { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'مسار المستوى' }));
    expect(screen.getByText('الأساس المعرفي', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'الجدارات الفنية' }));
    expect(screen.getByText('الاتصال المباشر')).toBeInTheDocument();
  });

  it('shows the learning plan as a list with its links, the periods as tabs and the badges as a second sub-tab, and the dated actions', async () => {
    open(myCareer({ ackRequired: false, ackReason: null, acknowledgedVersion: 3 }));
    fireEvent.click(await screen.findByRole('tab', { name: 'خطة التعلم' }));
    expect(screen.getByText('أمان العمل')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح الرابط' })).toHaveAttribute('href', 'https://example.com/u1');
    fireEvent.click(screen.getByRole('tab', { name: /السنة 2/ }));
    expect(screen.getByText('لا رابط بعد')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'الأوسمة' }));
    expect(screen.getByText('وسام الأساس')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'المطلوب' }));
    expect(screen.getByText('متأخر')).toBeInTheDocument();
    expect(screen.getByText('ما دمت في الفترة')).toBeInTheDocument();
  });

  it('searches and filters the learning units of a period, and offers the export to a person who holds its key', async () => {
    open(myCareer({ ackRequired: false, ackReason: null, acknowledgedVersion: 3 }));
    fireEvent.click(await screen.findByRole('tab', { name: 'خطة التعلم' }));
    fireEvent.change(screen.getByPlaceholderText('ابحث في الوحدات والمزودين'), { target: { value: 'لا وجود' } });
    expect(await screen.findByText('لا وحدات تطابق البحث والفلاتر.')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('ابحث في الوحدات والمزودين'), { target: { value: 'دروب' } });
    expect(await screen.findByText('أمان العمل')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تصدير' })).toBeInTheDocument();
  });

  it('says whose path it is: the person, the title, the unit and the manager, the code in parts, and the development stage', async () => {
    open(myCareer({ ackRequired: false, ackReason: null }));
    expect(await screen.findByText('منى الزهراني')).toBeInTheDocument();
    expect(screen.getByText('منسق الاستقطاب · وحدة الاستقطاب · المدير المباشر: فهد الدوسري')).toBeInTheDocument();
    for (const [label, value] of [['قطاع', 'OPS'], ['إدارة', '01'], ['قسم', '01'], ['وحدة', '01']] as const) expect(screen.getByText(label).closest('span')?.textContent).toContain(value);
    expect(screen.getByText('L9P')).toBeInTheDocument();
    expect(screen.getByText('مرحلة التطوير: التأسيس')).toBeInTheDocument();
  });

  it('says the path is not ready when the title has none, and explains a stale acknowledgement', async () => {
    open(myCareer({ available: false, content: null, contentVersion: null, ackRequired: false, ackReason: null, titleId: null }));
    expect(await screen.findByText('مسارك الوظيفي لم يُجهَّز بعد')).toBeInTheDocument();
  });
});
