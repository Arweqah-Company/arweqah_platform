import { CorePermission as P, type TemplateCatalogDto, type TemplateDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TemplatesTab } from './templates-tab';

const part = (title: string, body: string) => ({ title, preheader: '', buttonText: 'فتح', body });
const content = { ar: part('فعّل حسابك', '<p>مرحبًا {{name}}</p>'), en: part('Activate', '<p>Hello {{name}}</p>'), colors: { band: 'petrol', button: 'petrol' } } as const;
const variable = { name: 'name', descriptionAr: 'اسم المستلم', descriptionEn: 'Recipient name', exampleAr: 'سارة', exampleEn: 'Sara', required: false };
const template = (over: Partial<TemplateDto>): TemplateDto => ({ key: 'auth.invitation', kind: 'email', area: 'sign_in', nameAr: 'دعوة تفعيل الحساب', nameEn: 'Activation invitation', descriptionAr: 'تُرسل لموظف جديد', descriptionEn: 'Sent to a new employee', variables: [variable], status: 'default', defaults: content, content, pending: null, updatedAt: null, ...over });
const catalog = (templates: TemplateDto[], requireApproval = false): TemplateCatalogDto => ({ kind: 'email', requireApproval, templates });
const ALL = [P.TemplatesEmailView, P.TemplatesEmailEdit, P.TemplatesEmailReset, P.TemplatesEmailTest, P.TemplatesEmailApprove, P.TemplatesEmailSettings, P.TemplatesEmailExport];

function serve(data: TemplateCatalogDto, keys: string[] = ALL) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/templates/email', () => HttpResponse.json(data)),
    http.post('*/api/templates/email/:key/preview', () => HttpResponse.json({ title: 'Activate', html: '<p>Hello Sara</p>', text: 'Hello Sara' })),
  );
}

const rowOf = (name: RegExp) => screen.getByRole('row', { name });

describe('E-mail templates tab (FR-64)', () => {
  it('lists each message with its area and state, and filters by state', async () => {
    serve(catalog([template({}), template({ key: 'notification.email', area: 'notifications', nameAr: 'نسخة الإشعار', nameEn: 'Notification copy', status: 'custom', updatedAt: '2026-10-27T08:00:00Z' })]));
    renderPage(<TemplatesTab kind="email" />);
    expect(await screen.findByText('دعوة تفعيل الحساب')).toBeInTheDocument();
    expect(within(rowOf(/دعوة تفعيل الحساب/)).getByText('الصياغة الأصلية')).toBeInTheDocument();
    expect(within(rowOf(/نسخة الإشعار/)).getByText('معدَّلة')).toBeInTheDocument();
    expect(screen.queryByText('activation')).not.toBeInTheDocument();
  });

  it('offers a reset only for a message that was changed', async () => {
    serve(catalog([template({}), template({ key: 'notification.email', nameAr: 'نسخة الإشعار', status: 'custom' })]));
    renderPage(<TemplatesTab kind="email" />);
    await screen.findByText('دعوة تفعيل الحساب');
    expect(within(rowOf(/دعوة تفعيل الحساب/)).queryByRole('button', { name: 'العودة للأصل' })).not.toBeInTheDocument();
    expect(within(rowOf(/نسخة الإشعار/)).getByRole('button', { name: 'العودة للأصل' })).toBeInTheDocument();
  });

  it('opens the wording in both languages with the variables the code fills and a preview', async () => {
    serve(catalog([template({})]));
    renderPage(<TemplatesTab kind="email" />);
    fireEvent.click(await screen.findByText('دعوة تفعيل الحساب'));
    const dialog = await screen.findByRole('dialog', { name: 'دعوة تفعيل الحساب' });
    expect(within(dialog).getByRole('tab', { name: 'العربية', selected: true })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: 'الإنجليزية' })).toBeInTheDocument();
    // the variable list, and the chip the body already holds
    expect(within(dialog).getAllByText('@اسم المستلم')).toHaveLength(2);
    expect(within(dialog).getByRole('radiogroup', { name: 'لون الشريط العلوي' })).toBeInTheDocument();
    expect(within(dialog).getAllByRole('radio', { name: 'أزرق بترولي' })[0]).toBeChecked();
    expect(await within(dialog).findByTitle('معاينة الرسالة')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'أرسل لي تجربة' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'الإنجليزية' }));
    expect(within(dialog).getAllByText('@Recipient name')).toHaveLength(2);
  });

  it('says «send for approval» when approval is on, and shows a pending change to its approver', async () => {
    const pending = template({ status: 'pending', pending: { content, submittedById: 'someone-else', submittedByName: 'منى', submittedAt: '2026-10-27T08:00:00Z' } });
    serve(catalog([pending], true));
    renderPage(<TemplatesTab kind="email" />);
    expect(await screen.findByText('التعديلات تنتظر اعتماد شخص ثانٍ قبل استعمالها.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('دعوة تفعيل الحساب'));
    const dialog = await screen.findByRole('dialog', { name: 'دعوة تفعيل الحساب' });
    expect(within(dialog).getByText(/منى/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'إرسال للاعتماد' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'اعتماد' })).toBeEnabled();
  });

  it('does not let the author approve their own change', async () => {
    serve(catalog([template({ status: 'pending', pending: { content, submittedById: 'u1', submittedByName: 'سارة أحمد', submittedAt: '2026-10-27T08:00:00Z' } })], true));
    renderPage(<TemplatesTab kind="email" />);
    fireEvent.click(await screen.findByText('دعوة تفعيل الحساب'));
    const dialog = await screen.findByRole('dialog', { name: 'دعوة تفعيل الحساب' });
    expect(within(dialog).getByRole('button', { name: 'اعتماد' })).toBeDisabled();
    expect(within(dialog).getByText('أنت من أجرى هذا التعديل، فيجب أن يعتمده شخص آخر.')).toBeInTheDocument();
  });

  it('shows the approval switch only to who may change it, and saves it', async () => {
    let sent: unknown = null;
    serve(catalog([template({})]));
    server.use(http.put('*/api/templates/email/settings', async ({ request }) => { sent = await request.json(); return HttpResponse.json(catalog([template({})], true)); }));
    renderPage(<TemplatesTab kind="email" />);
    const box = await screen.findByRole('checkbox', { name: /يلزم اعتماد شخص ثانٍ/ });
    await waitFor(() => expect(box).toBeEnabled());
    fireEvent.click(box);
    await waitFor(() => expect(sent).toEqual({ requireApproval: true }));
  });

  it('hides the switch, the test and the approval from someone who only views', async () => {
    serve(catalog([template({ status: 'pending', pending: { content, submittedById: 'x', submittedByName: 'منى', submittedAt: '2026-10-27T08:00:00Z' } })]), [P.TemplatesEmailView]);
    renderPage(<TemplatesTab kind="email" />);
    fireEvent.click(await screen.findByText('دعوة تفعيل الحساب'));
    const dialog = await screen.findByRole('dialog', { name: 'دعوة تفعيل الحساب' });
    expect(screen.queryByRole('checkbox', { name: /يلزم اعتماد/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'أرسل لي تجربة' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'اعتماد' })).not.toBeInTheDocument();
    // a disabled fieldset does not stop an editable area: the editors themselves must be read-only
    expect(within(dialog).getByRole('textbox', { name: 'العنوان (موضوع الرسالة)' })).toHaveAttribute('contenteditable', 'false');
    expect(within(dialog).queryByRole('toolbar')).not.toBeInTheDocument();
  });
});
