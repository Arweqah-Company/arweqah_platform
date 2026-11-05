import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { N, orgNodes, orgTree, treeNode, versionsDto } from '../../../test/org-fixtures';
import { openOrgPage } from '../../../test/org-harness';
import { chooseOption } from '../../../test/select';

beforeEach(() => window.localStorage.clear());

describe('Organization page: what each person sees (FR-98)', () => {
  it('shows an ordinary employee only the team view: the hidden-units note, no full view, no compare, no structure buttons', async () => {
    openOrgPage({ team: orgTree({ hiddenCount: 4 }) });
    expect(await screen.findByText(/4 وحدة بلا موظفين مخفية في هذا العرض/)).toBeInTheDocument();
    expect(screen.getByText(/رؤية الهيكل كاملًا تحتاج الصلاحية/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'العرض' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'الموظفون فقط' })).not.toBeInTheDocument();
    for (const name of ['إضافة وحدة', 'تقسيمات الهيكل']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تصدير' })).not.toBeInTheDocument();
  });

  it('gives a holder of «see the full structure» the two views, and the full tree when the full view is chosen', async () => {
    const { asked } = openOrgPage({ keys: [CorePermission.OrgViewFull] });
    expect(await screen.findByRole('button', { name: 'الموظفون فقط' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/لا وحدات مخفية|بلا موظفين مخفية/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'العرض الكامل' }));
    await waitFor(() => expect(screen.queryByText(/تظهر الوحدات التي تحتها موظفون من شركتك/)).not.toBeInTheDocument());
    expect(asked.some((p) => p.get('view') === 'full')).toBe(true);
    expect(await screen.findByLabelText('أرِني هيكل شركة')).toBeInTheDocument();
  });

  it('warns the full-view holder about units with employees and no leader, and «show them» filters the table', async () => {
    const full = orgTree({ view: 'full', noLeader: [{ nodeId: N.legacy, companyId: 'company-1' }] });
    openOrgPage({ keys: [CorePermission.OrgViewFull], full });
    fireEvent.click(await screen.findByRole('button', { name: 'العرض الكامل' }));
    expect(await screen.findByText(/وحدات فيها موظفون بلا قائد في شركتهم \(1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'اعرضها' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // header, the unit, its parent sector (the way to it)
    expect(screen.getByRole('button', { name: 'وحدة قديمة' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'وحدة التوظيف' })).not.toBeInTheDocument();
  });

  it('asks the API for the compared company and fades the units it does not see', async () => {
    const compared = orgTree({ view: 'full', companyId: 'company-1', nodes: orgNodes.map((n) => ({ ...n, visibleForCompany: n.id !== N.office })) });
    const { asked } = openOrgPage({ keys: [CorePermission.OrgViewFull], full: compared });
    fireEvent.click(await screen.findByRole('button', { name: 'العرض الكامل' }));
    await chooseOption(await screen.findByLabelText('أرِني هيكل شركة'), 'company-1');
    expect(await screen.findByText(/الباهت بخط متقطع \(1 وحدة\)/)).toBeInTheDocument();
    expect(asked.some((p) => p.get('asCompany') === 'company-1')).toBe(true);
  });
});

describe('Organization page: header buttons need their keys and admin mode (FR-24)', () => {
  const ALL = [CorePermission.OrgUnitCreate, CorePermission.OrgLevelsManage];

  it('hides add unit and the divisions window while admin mode is off', async () => {
    openOrgPage({ keys: ALL, adminMode: false });
    await screen.findByText('إدارة الخدمات المشتركة');
    for (const name of ['إضافة وحدة', 'تقسيمات الهيكل']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('shows each button only to the person who holds its key', async () => {
    openOrgPage({ keys: [CorePermission.OrgUnitCreate], adminMode: true });
    expect(await screen.findByRole('button', { name: 'إضافة وحدة' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تقسيمات الهيكل' })).not.toBeInTheDocument();
  });

  it('shows both while admin mode is on', async () => {
    openOrgPage({ keys: ALL, adminMode: true });
    expect(await screen.findByRole('button', { name: 'تقسيمات الهيكل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة وحدة' })).toBeInTheDocument();
  });
});

describe('Organization page: search and filters (FR-96)', () => {
  it('finds a unit by its code, by a title in it, and keeps the way to it', async () => {
    openOrgPage();
    fireEvent.change(await screen.findByRole('searchbox', { name: 'بحث في الهيكل' }), { target: { value: 'OPS.03.01.01' } });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(5)); // header + the unit and its three parents
    fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في الهيكل' }), { target: { value: 'أخصائي موارد' } });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'وحدة التوظيف' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'قسم الموارد البشرية' })).toBeInTheDocument();
  });

  it('filters by the type of unit, the management mode and the status', async () => {
    openOrgPage();
    fireEvent.click(await screen.findByRole('button', { name: /تصفية/ }));
    await chooseOption(screen.getByLabelText('النوع'), 'lv-office');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // the office and its sector
    fireEvent.click(screen.getByRole('button', { name: 'مسح التصفية' }));
    await chooseOption(screen.getByLabelText('نوع الإدارة'), 'shared');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'مكتب قطاع التشغيل' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'قسم الموارد البشرية' })).toBeInTheDocument();
  });

  it('says so and offers to clear when nothing matches', async () => {
    openOrgPage();
    fireEvent.change(await screen.findByRole('searchbox', { name: 'بحث في الهيكل' }), { target: { value: 'لا يوجد هذا' } });
    expect(await screen.findByText('لا وحدات تطابق البحث أو الفلاتر')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث والفلاتر' }));
    expect(await screen.findByRole('button', { name: 'وحدة التوظيف' })).toBeInTheDocument();
  });
});

describe('Organization page: the four views (FR-96)', () => {
  it('draws the chart with the group open only, colours the types and opens a unit with its round button', async () => {
    openOrgPage({ view: 'chart' });
    const chart = await screen.findByRole('group', { name: 'مخطط الهيكل التنظيمي' });
    expect(within(chart).getByText('قطاع التشغيل')).toBeInTheDocument();
    expect(within(chart).queryByText('إدارة الخدمات المشتركة')).not.toBeInTheDocument();
    fireEvent.click(within(chart).getByRole('button', { name: /فتح «قطاع التشغيل»/ }));
    expect(within(chart).getByText('إدارة الخدمات المشتركة')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'ألوان أنواع الوحدات' }).textContent).toContain('مكتب');
  });

  it('opens every unit and rings the one the search finds', async () => {
    openOrgPage({ view: 'chart' });
    const chart = await screen.findByRole('group', { name: 'مخطط الهيكل التنظيمي' });
    fireEvent.click(screen.getByRole('button', { name: 'فتح الكل' }));
    expect(within(chart).getByText('وحدة التوظيف')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'طي الكل' }));
    expect(within(chart).queryByText('وحدة التوظيف')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في الهيكل' }), { target: { value: 'OPS.03.01.01' } });
    expect(await within(chart).findByText('وحدة التوظيف')).toBeInTheDocument();
  });

  it('draws the icicle as blocks that select a unit', async () => {
    openOrgPage({ view: 'icicle' });
    const picture = await screen.findByRole('group', { name: 'مخطط الهيكل التنظيمي' });
    fireEvent.click(within(picture).getByRole('button', { name: /^قسم الموارد البشرية/ }));
    expect(await screen.findByRole('complementary', { name: /تفاصيل الوحدة: قسم الموارد البشرية/ })).toBeInTheDocument();
  });

  it('shows the same units as cards, and the view is remembered', async () => {
    openOrgPage({ view: 'chart' });
    fireEvent.click(await screen.findByRole('button', { name: 'بطاقات' }));
    expect(await screen.findByText('وحدة التوظيف')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('view:org')).toBe('cards');
  });

  it('lists every unit in the table with its code (left to right), type, mode, leader, employees, titles and marks', async () => {
    openOrgPage();
    const row = (await screen.findByRole('button', { name: 'مكتب قطاع التشغيل' })).closest('tr') as HTMLElement;
    expect(within(row).getByText('OPS.09.00.00')).toHaveAttribute('dir', 'ltr');
    expect(within(row).getByText('مكتب')).toBeInTheDocument();
    expect(within(row).getByText('لكل شركة')).toBeInTheDocument();
    expect(within(row).getByText('خالد')).toBeInTheDocument();
    const legacy = screen.getByRole('button', { name: 'وحدة قديمة' }).closest('tr') as HTMLElement;
    expect(within(legacy).getByText('الرمز غير محدد')).toBeInTheDocument();
    expect(within(legacy).getAllByText('بلا قائد').length).toBeGreaterThan(0);
    const shared = screen.getByRole('button', { name: 'قسم الموارد البشرية' }).closest('tr') as HTMLElement;
    expect(within(shared).getByText('مشتركة')).toBeInTheDocument();
    expect(within(shared).getByText('موروثة')).toBeInTheDocument();
  });
});

describe('Organization page: the details of a unit (FR-96)', () => {
  const select = async (name: string) => {
    fireEvent.click(await screen.findByRole('button', { name }));
    return screen.findByRole('complementary', { name: `تفاصيل الوحدة: ${name}` });
  };

  it('shows the path, marks and the overview, and closes', async () => {
    openOrgPage();
    const details = await select('قسم الموارد البشرية');
    expect(within(details).getByRole('button', { name: 'إدارة الخدمات المشتركة' })).toBeInTheDocument(); // a part of the path
    expect(within(details).getByText(/مشتركة: تُدار مرة واحدة من أروقة/)).toBeInTheDocument();
    expect(within(details).getByText(/موروثة من الأب/)).toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument());
  });

  it('writes the employees of each company with their numbers in the full view', async () => {
    const full = orgTree({ view: 'full', nodes: orgNodes.map((n) => (n.id === N.section ? treeNode(n.id, 'section', n.parentId, n.nameAr, { ...n, staffByCompany: { 'company-1': 2, other: 1 } }) : { ...n, staffByCompany: {} })) });
    openOrgPage({ keys: [CorePermission.OrgViewFull], full });
    fireEvent.click(await screen.findByRole('button', { name: 'العرض الكامل' }));
    const details = await select('قسم الموارد البشرية');
    expect(within(details).getByRole('img', { name: 'توزيع الموظفين حسب الشركة' })).toBeInTheDocument();
    expect(within(details).getByText('other')).toBeInTheDocument(); // a company the lookup does not know is named by its id
    expect(within(details).getAllByText('أروقة الريادة').length).toBeGreaterThan(1); // in the path and in the legend
  });

  it('moves between the tabs and lists the job titles of a unit that takes them', async () => {
    openOrgPage();
    const details = await select('قسم الموارد البشرية');
    fireEvent.click(within(details).getByRole('tab', { name: 'المسميات' }));
    expect(within(details).getByText('أخصائي موارد')).toBeInTheDocument();
    expect(within(details).getByText('2 موظف')).toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: /إضافة مسمى/ })).not.toBeInTheDocument(); // no key
  });

  it('says that a sector takes no titles', async () => {
    openOrgPage();
    const details = await select('قطاع التشغيل');
    fireEvent.click(within(details).getByRole('tab', { name: 'المسميات' }));
    expect(within(details).getByText(/لا يحمل مسميات ولا موظفين/)).toBeInTheDocument();
  });

  it('offers add, edit and remove of titles with the job-title keys in admin mode', async () => {
    openOrgPage({ keys: [CorePermission.JobTitlesCreate, CorePermission.JobTitlesUpdate, CorePermission.JobTitlesDelete], adminMode: true });
    const details = await select('قسم الموارد البشرية');
    fireEvent.click(within(details).getByRole('tab', { name: 'المسميات' }));
    expect(within(details).getByRole('button', { name: 'إضافة مسمى' })).toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: /^تعديل: أخصائي موارد/ }));
    expect(await screen.findByRole('dialog', { name: 'تعديل المسمى' })).toBeInTheDocument();
  });

  it('shows each title action only with its own key', async () => {
    openOrgPage({ keys: [CorePermission.JobTitlesUpdate], adminMode: true });
    const details = await select('قسم الموارد البشرية');
    fireEvent.click(within(details).getByRole('tab', { name: 'المسميات' }));
    expect(await within(details).findByRole('button', { name: /^تعديل: أخصائي موارد/ })).toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: /^حذف: / })).not.toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: 'إضافة مسمى' })).not.toBeInTheDocument();
  });

  it('offers set-code on a unit with no code, to someone who can update units', async () => {
    openOrgPage({ keys: [CorePermission.OrgUnitUpdate], adminMode: true });
    const details = await select('وحدة قديمة');
    fireEvent.click(within(details).getByRole('button', { name: 'تحديد الرمز' }));
    expect(await screen.findByRole('dialog', { name: 'تحديد رمز الوحدة' })).toBeInTheDocument();
  });
});

describe('Organization page: empty structure', () => {
  it('explains an empty team view and offers the first unit to someone who can add one', async () => {
    openOrgPage({ team: orgTree({ nodes: [] }), keys: [CorePermission.OrgUnitCreate], adminMode: true });
    expect(await screen.findByText('لا وحدات تحتها موظفون في شركتك بعد')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة أول وحدة' })).toBeInTheDocument();
  });
});

describe('Organization page: scheduled changes and links (FR-99)', () => {
  const scheduled = orgTree({ nodes: orgNodes.map((n) => (n.id === N.section ? { ...n, hasScheduledChange: true } : n)) });

  it('marks a unit with a dated change waiting as a scheduled change, in the table and in its details', async () => {
    openOrgPage({ team: scheduled });
    const row = (await screen.findByRole('button', { name: 'قسم الموارد البشرية' })).closest('tr') as HTMLElement;
    expect(within(row).getByText('تغيير مجدول')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'قسم الموارد البشرية' }));
    const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية' });
    expect(within(details).getByText('تغيير مجدول')).toBeInTheDocument();
  });

  it('shows the three new tabs, each for a holder of the view key', async () => {
    openOrgPage();
    fireEvent.click(await screen.findByRole('button', { name: 'قسم الموارد البشرية' }));
    const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية' });
    expect(within(details).getAllByRole('tab').map((t) => t.textContent)).toEqual(['نظرة عامة', 'القادة', 'المسميات', 'الميثاق', 'السجل']);
  });

  it('opens the first top unit on a tab from a link (the welcome tour uses it), once', async () => {
    openOrgPage({ path: '/?unit=first&tab=charter', handlers: [http.get('*/api/org/nodes/:id/versions', () => HttpResponse.json(versionsDto()))] });
    const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قطاع التشغيل' });
    expect(within(details).getByRole('tab', { name: 'الميثاق' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(details).getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument()); // closing is never undone by the link
  });
});
