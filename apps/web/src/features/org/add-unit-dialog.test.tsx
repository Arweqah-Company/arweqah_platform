import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { N, orgNodes, orgTree, treeNode } from '../../../test/org-fixtures';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption, optionLabels } from '../../../test/select';
import { AddUnitDialog } from './add-unit-dialog';

const open = (parentId: string | null = null, tree = orgTree()) => {
  const onClose = vi.fn();
  const posted: unknown[] = [];
  server.use(http.post('*/api/org/nodes', async ({ request }) => { posted.push(await request.json()); return HttpResponse.json({ id: 'new' }, { status: 201 }); }));
  renderPage(<AddUnitDialog tree={tree} parentId={parentId} onClose={onClose} />);
  return { onClose, posted };
};
const save = () => screen.getByRole('button', { name: 'حفظ الوحدة' });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Add unit: the type follows the rules table (FR-96)', () => {
  it('offers under the group only what the table allows there: sector, department, office', async () => {
    open();
    expect(await optionLabels(await screen.findByLabelText('النوع *'))).toEqual(['قطاع', 'إدارة', 'مكتب']);
  });

  it('offers under a section only unit and office', async () => {
    open(N.section);
    expect(await optionLabels(await screen.findByLabelText('النوع *'))).toEqual(['وحدة', 'مكتب']);
  });

  it('lists as parents the group and every unit that can have children, never a unit that cannot', async () => {
    open();
    const labels = await optionLabels(await screen.findByRole('combobox', { name: 'الأب' }));
    expect(labels.some((l) => l.includes('أروقة الريادة (الجذر)'))).toBe(true);
    expect(labels.some((l) => l.includes('قسم الموارد البشرية'))).toBe(true);
    expect(labels.some((l) => l.includes('وحدة التوظيف'))).toBe(false);
  });

  it('follows an edited rules table: only what it still allows under the parent', async () => {
    const closed = orgTree({ rules: { root: ['sector'], sector: [], department: [], section: ['unit'], unit: [], office: [] } });
    open(N.section, closed);
    expect(await optionLabels(await screen.findByLabelText('النوع *'))).toEqual(['وحدة']);
  });
});

describe('Add unit: the suggested code and who will see the unit (FR-96, FR-97)', () => {
  it('suggests the next free number under a parent and explains an inherited shared unit', async () => {
    open(N.section);
    expect(await screen.findByText('OPS.03.01.02')).toHaveAttribute('dir', 'ltr'); // the unit OPS.03.01.01 is taken
    expect(screen.getByText(/ستظهر لكل الشركات حين يُسكَّن فيها أول موظف من أي شركة/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /تُورَّث من الأب/ })).toBeChecked();
    expect(screen.getByText('حاليًا: مشتركة.')).toBeInTheDocument();
  });

  it('asks for three capital letters under the group, shows the code as they type, and has no «inherit» card', async () => {
    open();
    expect(await screen.findByLabelText('رمز الوحدة (ثلاثة أحرف) *')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /تُورَّث من الأب/ })).not.toBeInTheDocument();
    type('رمز الوحدة (ثلاثة أحرف) *', 'abc');
    expect(await screen.findByText('ABC.00.00.00')).toBeInTheDocument();
    expect(screen.queryByText('ثلاثة أحرف إنجليزية كبيرة.')).not.toBeInTheDocument();
    type('رمز الوحدة (ثلاثة أحرف) *', 'AB');
    expect(await screen.findByText('ثلاثة أحرف إنجليزية كبيرة.')).toBeInTheDocument();
  });

  it('explains that a per-company unit shows only once an employee of the company is placed in it', async () => {
    open();
    fireEvent.click(await screen.findByRole('radio', { name: /لكل شركة/ }));
    expect(await screen.findByText(/لن تظهر في هيكل شركة حتى يُسكَّن فيها أول موظف منها/)).toBeInTheDocument();
  });

  it('reports a full slot as an error on the type, and an uncoded parent', async () => {
    const taken = orgTree({ rules: { ...orgTree().rules, section: ['unit', 'office', 'section'] } });
    open(N.section, taken);
    await chooseOption(await screen.findByLabelText('النوع *'), 'lv-section');
    expect(await screen.findByText('لا خانة رمز متاحة لهذا النوع تحت هذا الأب.')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('asks to set the parent code first when the parent has none', async () => {
    const legacySection = orgTree({ nodes: [...orgNodes, treeNode('n-old', 'section', N.sector, 'قسم قديم')] });
    open('n-old', legacySection);
    expect(await screen.findByText('هذا الأب بلا رمز: حدّد رمزه أولًا.')).toBeInTheDocument();
  });
});

describe('Add unit: live validation and saving (FR-96)', () => {
  it('explains a missing Arabic name as the person leaves the field, and keeps save off until the form is complete', async () => {
    open(N.section);
    const name = await screen.findByLabelText('الاسم بالعربي *');
    expect(screen.queryByText('هذا الحقل مطلوب.')).not.toBeInTheDocument();
    fireEvent.blur(name);
    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.change(name, { target: { value: 'وحدة الاستقطاب' } });
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('refuses a start date that is out of range', async () => {
    open(N.section);
    fireEvent.change(await screen.findByLabelText('تاريخ بدء العمل *'), { target: { value: '1900-01-01' } });
    expect(await screen.findByText(/تاريخ غير معقول/)).toBeInTheDocument();
  });

  it('sends the unit under a parent with «inherit» as no mode, and English falling back to the Arabic name', async () => {
    const { posted, onClose } = open(N.section);
    type('الاسم بالعربي *', 'وحدة الاستقطاب');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posted[0]).toMatchObject({ levelId: 'lv-unit', parentId: N.section, nameAr: 'وحدة الاستقطاب', nameEn: 'وحدة الاستقطاب', managementMode: null, jobTitles: [] });
    expect(posted[0]).not.toHaveProperty('codePrefix');
  });

  it('sends a unit under the group with its code letters and the chosen mode', async () => {
    const { posted, onClose } = open();
    await chooseOption(await screen.findByLabelText('النوع *'), 'lv-department');
    type('الاسم بالعربي *', 'إدارة الاتصال');
    type('رمز الوحدة (ثلاثة أحرف) *', 'COM');
    expect(save()).toBeDisabled(); // how it is managed must be chosen
    fireEvent.click(screen.getByRole('radio', { name: /^مشتركة/ }));
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posted[0]).toMatchObject({ levelId: 'lv-department', parentId: null, codePrefix: 'COM', managementMode: 'shared' });
  });

  it('shows the API refusal inside the dialog', async () => {
    open(N.section);
    server.use(http.post('*/api/org/nodes', () => HttpResponse.json({ statusCode: 422, code: 'NO_CODE_SLOT', message: 'No free code slot' }, { status: 422 })));
    type('الاسم بالعربي *', 'وحدة الاستقطاب');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
