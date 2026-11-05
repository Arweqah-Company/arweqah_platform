import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { N, orgNodes, orgTree, treeNode } from '../../../test/org-fixtures';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption, optionLabels } from '../../../test/select';
import { EditUnitDialog } from './edit-unit-dialog';
import { MoveDialog } from './move-dialog';
import type { OrgNode } from './org-model';
import { SetCodeDialog } from './set-code-dialog';

const node = (id: string, tree = orgTree()): OrgNode => tree.nodes.find((n) => n.id === id) as OrgNode;

function capture(method: 'put' | 'post', path: string) {
  const sent: unknown[] = [];
  server.use(http[method](path, async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ id: 'x' }); }));
  return sent;
}

describe('Set the code of a unit that has none (FR-96)', () => {
  const tree = orgTree({ nodes: [...orgNodes, treeNode('n-sec2', 'section', N.dept, 'قسم بلا رمز')] });

  it('explains the format as the person types and offers the code the unit would get now', async () => {
    const onClose = vi.fn();
    const sent = capture('put', '*/api/org/nodes/:id/code');
    renderPage(<SetCodeDialog tree={tree} node={node('n-sec2', tree)} onClose={onClose} />);
    const input = await screen.findByLabelText('الرمز *');
    fireEvent.change(input, { target: { value: 'ops.3' } });
    expect(await screen.findByText('استخدم الصيغة OPS.03.03.01.')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /استخدام المقترح/ }));
    expect(input).toHaveValue('OPS.03.02.00');
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent).toEqual([{ code: 'OPS.03.02.00' }]);
  });
});

describe('Move a unit (FR-31, FR-96)', () => {
  it('offers only places the rules allow, never the unit itself or what is under it', async () => {
    renderPage(<MoveDialog tree={orgTree()} node={node(N.section)} onClose={() => undefined} />);
    const labels = await optionLabels(await screen.findByRole('combobox', { name: 'الأب الجديد' }));
    expect(labels.some((l) => l.includes('مكتب قطاع التشغيل'))).toBe(true); // a section may sit under an office
    expect(labels.some((l) => l.includes('إدارة الخدمات المشتركة'))).toBe(true);
    expect(labels.some((l) => l.includes('قسم الموارد البشرية'))).toBe(false);
    expect(labels.some((l) => l.includes('وحدة التوظيف'))).toBe(false);
    expect(labels.some((l) => l.includes('أروقة الريادة'))).toBe(false); // a section may not sit directly under the group
  });

  it('moves the unit to the chosen parent, or to the group where the rules allow it', async () => {
    const sent = capture('post', '*/api/org/nodes/:id/move');
    const onClose = vi.fn();
    renderPage(<MoveDialog tree={orgTree()} node={node(N.dept)} onClose={onClose} />);
    const move = await screen.findByRole('button', { name: 'نقل' });
    expect(move).toBeDisabled();
    await chooseOption(screen.getByRole('combobox', { name: 'الأب الجديد' }), 'root');
    await waitFor(() => expect(move).toBeEnabled());
    fireEvent.click(move);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent).toEqual([{ parentId: null }]);
  });
});

describe('Edit a unit (FR-31)', () => {
  it('keeps names, start date and the active box, validates as the person types, and sends the changes', async () => {
    const sent = capture('put', '*/api/org/nodes/:id');
    server.use(http.get('*/api/employees/managers', () => HttpResponse.json([])));
    const onClose = vi.fn();
    renderPage(<EditUnitDialog node={node(N.section)} onClose={onClose} />);
    const name = await screen.findByLabelText('الاسم بالعربي *');
    expect(name).toHaveValue('قسم الموارد البشرية');
    fireEvent.change(name, { target: { value: 'ق' } });
    expect(await screen.findByText('يجب ألا يقل عن 2 أحرف.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(name, { target: { value: 'قسم الموارد' } });
    fireEvent.click(screen.getByLabelText('وحدة تعمل'));
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled(); // a change of the name is dated: it needs its reason
    fireEvent.change(screen.getByLabelText('سبب التغيير *'), { target: { value: 'تصحيح الاسم' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent[0]).toMatchObject({ nameAr: 'قسم الموارد', startDate: '2024-01-01', isActive: false, managerId: null, reason: 'تصحيح الاسم' });
    expect((sent[0] as { effectiveFrom: string }).effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('records a later effective date as a scheduled change and refuses a past one', async () => {
    const sent = capture('put', '*/api/org/nodes/:id');
    server.use(http.get('*/api/employees/managers', () => HttpResponse.json([])));
    renderPage(<EditUnitDialog node={node(N.section)} onClose={() => undefined} />);
    const name = await screen.findByLabelText('الاسم بالعربي *');
    fireEvent.change(name, { target: { value: 'قسم الموارد والكفاءات' } });
    fireEvent.change(screen.getByLabelText('سبب التغيير *'), { target: { value: 'توسعة الاختصاص' } });
    fireEvent.change(screen.getByLabelText('يسري من'), { target: { value: '2020-01-01' } });
    expect(await screen.findByText('لا يبدأ التغيير في الماضي.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('يسري من'), { target: { value: '2099-01-01' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ effectiveFrom: '2099-01-01', reason: 'توسعة الاختصاص' });
  });
});
