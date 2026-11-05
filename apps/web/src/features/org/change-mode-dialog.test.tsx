import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { N, orgNodes } from '../../../test/org-fixtures';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ChangeModeDialog } from './change-mode-dialog';
import type { OrgNode } from './org-model';

const byId = (id: string): OrgNode => orgNodes.find((n) => n.id === id) as OrgNode;

const open = (id: string) => {
  const onClose = vi.fn();
  const posted: { url: string; body: unknown }[] = [];
  server.use(http.post('*/api/org/nodes/:id/management-mode', async ({ request, params }) => {
    posted.push({ url: String(params.id), body: await request.json() });
    return HttpResponse.json({ node: {}, impact: { unitsAffected: 3, employeesOfOtherCompanies: 12 } });
  }));
  const node = byId(id);
  renderPage(<ChangeModeDialog node={node} parent={orgNodes.find((n) => n.id === node.parentId) ?? null} onClose={onClose} />);
  return { onClose, posted };
};
const confirm = () => screen.getByRole('button', { name: 'تأكيد التغيير' });

describe('Change management type (FR-97)', () => {
  it('shows the direction, warns about the impact, and needs a reason before it confirms', async () => {
    open(N.dept); // shared now
    expect(await screen.findByText(/من «مشتركة» إلى «لكل شركة»/)).toBeInTheDocument();
    expect(screen.getByText(/يتغير مديرهم من قائد أروقة إلى قائد شركتهم/)).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    const reason = screen.getByLabelText('سبب التغيير *');
    fireEvent.blur(reason);
    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: 'ab' } });
    expect(await screen.findByText('يجب ألا يقل عن 3 أحرف.')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'دمج الخدمات' } });
    await waitFor(() => expect(confirm()).toBeEnabled());
  });

  it('turns a per-company unit into a shared one and the warning follows the direction', async () => {
    open(N.sector); // per company, set explicitly
    expect(await screen.findByText(/من «لكل شركة» إلى «مشتركة»/)).toBeInTheDocument();
    expect(screen.getByText(/يصير مديرهم قائد أروقة/)).toBeInTheDocument();
  });

  it('cannot choose the mode the unit already has, and offers «inherit» only under a parent', async () => {
    open(N.sector);
    expect(await screen.findByRole('radio', { name: /^لكل شركة/ })).toBeDisabled();
    expect(screen.queryByRole('radio', { name: /تُورَّث من الأب/ })).not.toBeInTheDocument(); // a sector has nothing to inherit from
  });

  it('sends the mode and the reason, then shows the impact the API counted', async () => {
    const { posted } = open(N.dept);
    fireEvent.change(await screen.findByLabelText('سبب التغيير *'), { target: { value: 'دمج الخدمات' } });
    await waitFor(() => expect(confirm()).toBeEnabled());
    fireEvent.click(confirm());
    expect(await screen.findByText(/الوحدات المتأثرة: 3\. .*: 12\./)).toBeInTheDocument();
    expect(posted).toEqual([{ url: N.dept, body: { mode: 'per_company', reason: 'دمج الخدمات' } }]);
  });

  it('can go back to inheriting from the parent (no explicit mode)', async () => {
    const { posted } = open(N.dept);
    fireEvent.click(await screen.findByRole('radio', { name: /تُورَّث من الأب/ }));
    fireEvent.change(screen.getByLabelText('سبب التغيير *'), { target: { value: 'عودة للأصل' } });
    await waitFor(() => expect(confirm()).toBeEnabled());
    fireEvent.click(confirm());
    await screen.findByText(/الوحدات المتأثرة/);
    expect(posted[0]?.body).toEqual({ mode: null, reason: 'عودة للأصل' });
  });
});
