import type { AgentFormDto, AgentLinkDto, AgentMessageDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Network } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { NavContext } from '@/core/navigation';
import { server } from '../../../test/msw';
import { answer, draft, open, reply, write } from '../../../test/agent-chat-support';

const ORG_NAV = [{ to: '/org', labelKey: 'nav.org', icon: Network, pageKey: 'org' as const }];
const withNav = (nav: typeof ORG_NAV) => (chat: React.ReactElement) => <NavContext.Provider value={nav}>{chat}</NavContext.Provider>;

const withLinks = (links: AgentLinkDto[]): AgentMessageDto => ({ ...reply('الهيكل التنظيمي يعرض شجرة المجموعة.'), links });

const FORM: AgentFormDto = {
  operationId: 'TicketSetupController.createType', labelAr: 'إضافة نوع تذكرة', labelEn: 'Add a ticket type', status: 'open', values: { deskId: 'desk-1', isActive: true },
  fields: [
    { name: 'nameAr', label: 'الاسم بالعربية', required: true, type: 'text', maxLength: 10 },
    { name: 'kind', label: 'النوع', required: true, type: 'select', options: [{ label: 'الدعم الفني', value: 'k1' }, { label: 'طلب صيانة', value: 'k2' }] },
    { name: 'dueDays', label: 'أيام الاستحقاق', required: false, type: 'integer', min: 1, max: 30 },
    { name: 'isPersonal', label: 'شخصي', required: false, type: 'boolean' },
  ],
};
const withForm = (over: Partial<AgentFormDto> = {}): AgentMessageDto => ({ ...reply('أحتاج الاسم والنوع.'), form: { ...FORM, ...over } });

describe('Links under an explanation (FR-153)', () => {
  const LINK = [{ sectionId: 'org', title: 'الهيكل التنظيمي', page: 'org' }];

  it('shows the manual section and the page, each a real link', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', withLinks(LINK))));
    open(undefined, withNav(ORG_NAV));
    await write('ما هو الهيكل التنظيمي؟');
    expect(await screen.findByRole('link', { name: /اقرأ في دليل الاستخدام: الهيكل التنظيمي/ })).toHaveAttribute('href', '/docs?s=org');
    expect(screen.getByRole('link', { name: /افتح: الهيكل التنظيمي/ })).toHaveAttribute('href', '/org');
  });

  it('shows only the manual link when the page is not in the person\'s menu now', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', withLinks(LINK))));
    open(undefined, withNav([]));
    await write('ما هو الهيكل التنظيمي؟');
    expect(await screen.findByRole('link', { name: /اقرأ في دليل الاستخدام/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /افتح:/ })).not.toBeInTheDocument();
  });

  it('says a page needs admin mode, and a section with no page has no page link', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', withLinks([{ sectionId: 'roles', title: 'الأدوار', page: 'roles' }, { sectionId: 'profile', title: 'ملفي', page: null }]))));
    open(undefined, withNav([{ to: '/roles', labelKey: 'nav.roles', icon: Network, pageKey: 'roles' as never, requiresAdminMode: true } as never]));
    await write('ما هي الأدوار؟');
    expect(await screen.findByText('يحتاج وضع الإدارة')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /افتح:/ })).toHaveLength(1);
  });
});

describe('The form inside the chat (FR-152)', () => {
  const serveForm = () => server.use(http.post('*/api/agent/messages/stream', () => answer('c1', withForm())));

  it('offers a button next to the questions; pressing it opens the fields of the action with the choices', async () => {
    serveForm();
    open();
    await write('أضف نوع تذكرة');
    expect(await screen.findByText('أحتاج الاسم والنوع.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/الاسم بالعربية/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'افتح الفورم' }));
    expect(await screen.findByLabelText(/الاسم بالعربية/)).toBeInTheDocument();
    expect(screen.getByLabelText('أيام الاستحقاق')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('شخصي')).toHaveAttribute('type', 'checkbox');
    fireEvent.click(screen.getByRole('combobox', { name: /النوع/ }));
    expect(await screen.findByRole('option', { name: 'الدعم الفني' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'طلب صيانة' })).toBeInTheDocument();
  });

  it('talks while the person types: a mandatory field left empty, a number out of its range, a text too long; the send button waits until all is right', async () => {
    serveForm();
    open();
    await write('أضف نوع تذكرة');
    fireEvent.click(await screen.findByRole('button', { name: 'افتح الفورم' }));
    const name = await screen.findByLabelText(/الاسم بالعربية/);
    fireEvent.change(name, { target: { value: 'x' } });
    fireEvent.change(name, { target: { value: '' } });
    expect(await screen.findByText('هذا الحقل إلزامي.')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'اسم أطول من عشرة أحرف' } });
    expect(await screen.findByText('بحد أقصى 10 حرفًا.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('أيام الاستحقاق'), { target: { value: '99' } });
    expect(await screen.findByText(/أدخل رقمًا بين/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال الفورم' })).toBeDisabled();
  });

  it('sends what was typed (a number as a number, with what the assistant had filled in), and the form becomes «sent» with the confirmation card after it', async () => {
    let sent: unknown;
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', withForm())),
      http.post('*/api/agent/forms/m1/submit', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ conversationId: 'c1', messages: [{ ...withForm({ status: 'submitted' }), id: 'm1' }, { ...reply('إضافة النوع', draft()), id: 'm2' }] }, { status: 201 });
      }),
    );
    open();
    await write('أضف نوع تذكرة');
    fireEvent.click(await screen.findByRole('button', { name: 'افتح الفورم' }));
    fireEvent.change(await screen.findByLabelText(/الاسم بالعربية/), { target: { value: 'مشاكل' } });
    const kind = screen.getByRole('combobox', { name: /النوع/ });
    fireEvent.click(kind);
    fireEvent.click(await screen.findByRole('option', { name: 'الدعم الفني' }));
    fireEvent.change(screen.getByLabelText('أيام الاستحقاق'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الفورم' }));
    expect(await screen.findByText('أُرسلت الفورم')).toBeInTheDocument();
    expect(await screen.findByText('إضافة النوع «مشكلة تقنية» إلى قسم التقنية')).toBeInTheDocument();
    expect(sent).toEqual({ values: { deskId: 'desk-1', isActive: true, nameAr: 'مشاكل', kind: 'k1', dueDays: '5' } });
    expect(screen.queryByLabelText(/الاسم بالعربية/)).not.toBeInTheDocument();
  });

  it('shows the mistakes the server found under their own fields', async () => {
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', withForm())),
      http.post('*/api/agent/forms/m1/submit', () => HttpResponse.json({ code: 'AGENT_FORM_INVALID', message: 'The form has mistakes', details: { fields: { nameAr: 'Too small' } } }, { status: 422 })),
    );
    open();
    await write('أضف نوع تذكرة');
    fireEvent.click(await screen.findByRole('button', { name: 'افتح الفورم' }));
    fireEvent.change(await screen.findByLabelText(/الاسم بالعربية/), { target: { value: 'م' } });
    fireEvent.click(screen.getByRole('combobox', { name: /النوع/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'طلب صيانة' }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الفورم' }));
    expect(await screen.findByText('Too small')).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم بالعربية/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('a form already sent shows only «sent», with no fields and no button', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', withForm({ status: 'submitted' }))));
    open();
    await write('أضف نوع تذكرة');
    expect(await screen.findByText('أُرسلت الفورم')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'افتح الفورم' })).not.toBeInTheDocument();
  });
});

describe('The status line (FR-151)', () => {
  it('says the assistant is checking the permissions while it does', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post('*/api/agent/messages/stream', () => new HttpResponse(new ReadableStream({ async start(c) {
      c.enqueue(new TextEncoder().encode(`event: status\ndata: ${JSON.stringify({ code: 'permission' })}\n\n`));
      await gate;
      c.enqueue(new TextEncoder().encode(`event: reply\ndata: ${JSON.stringify({ conversationId: 'c1', messages: [reply('ليس لديك صلاحية.')] })}\n\n`));
      c.close();
    } }), { headers: { 'content-type': 'text/event-stream' } })));
    open();
    await write('هل لي صلاحية لإضافة موظف؟');
    expect(await screen.findByText('يتحقق من صلاحياتك…')).toBeInTheDocument();
    release();
    expect(await screen.findByText('ليس لديك صلاحية.')).toBeInTheDocument();
    await waitFor(() => expect(within(document.body).queryByText('يتحقق من صلاحياتك…')).not.toBeInTheDocument());
  });
});
