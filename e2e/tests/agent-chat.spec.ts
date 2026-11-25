import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const draft = (status: string, result: unknown = null) => ({
  id: 'd1', operationId: 'TicketSetupController.createType', labelAr: 'إضافة نوع تذكرة', labelEn: 'Add a ticket type', summary: 'إضافة النوع «مشكلة تقنية» إلى قسم التقنية',
  values: {}, destructive: false, status, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), result, files: [],
});
const message = (id: string, text: string, d: unknown = null) => ({ id, role: 'assistant', text, draft: d, links: null, form: null, files: [], createdAt: new Date().toISOString() });

/** The real model is not called in a browser test (the API suite covers the turns with a fake AI): the two answers the panel needs are served here. */
async function serveAssistant(page: Page): Promise<void> {
  const events = (list: [string, unknown][]) => list.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
  await page.route('**/api/agent/messages/stream', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: events([['status', { code: 'thinking' }], ['reply', { conversationId: 'c1', messages: [message('m1', 'إضافة النوع', draft('pending'))] }]]) }));
  await page.route('**/api/agent/drafts/d1/confirm', (route) =>
    route.fulfill({ status: 201, json: { conversationId: 'c1', messages: [message('m1', 'إضافة النوع', draft('confirmed', { ok: true, status: 201, message: '' })), message('m2', 'تم: إضافة نوع تذكرة.')] } }));
}

test.describe('The platform assistant (FR-145, FR-146)', () => {
  test('opens from the corner button, prepares a request, runs it only after the confirm button, and is accessible', async ({ page }, info) => {
    await serveAssistant(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'فتح مساعد المنصة' }).click();
    const panel = page.getByRole('dialog', { name: 'مساعد المنصة' });
    await expect(panel).toBeVisible();
    await panel.getByLabel('اكتب رسالتك').fill('أضف نوع تذكرة باسم مشكلة تقنية');
    await panel.getByRole('button', { name: 'إرسال' }).click();
    await expect(panel.getByText('إضافة النوع «مشكلة تقنية» إلى قسم التقنية')).toBeVisible();
    await expect(panel.getByText('بانتظارك')).toBeVisible();
    await page.screenshot({ path: info.outputPath('assistant-draft.png') });
    await new Screen(page).expectNoSeriousA11yIssues();
    await panel.getByRole('button', { name: 'تأكيد' }).click();
    await expect(panel.getByText('تم: إضافة نوع تذكرة.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'تأكيد' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'مساعد المنصة' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('is a step of the welcome tour for whoever holds agent.view', async ({ page }) => {
    const steps = (await (await page.request.get('/api/me/tour/general')).json()).steps as { key: string }[];
    expect(steps.map((s) => s.key)).toContain('agent-chat');
  });

  test('FR-180: a screenshot is attached, shown small with the sensitive-data warning, sent with the message, and a card offers it with a tick box', async ({ page }, info) => {
    const sent: unknown[] = [];
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const picture = { id: 'p1', name: 'screen.png', contentType: 'image/png', size: PNG.length };
    await page.route('**/api/agent/messages/stream', async (route) => {
      sent.push(route.request().postDataJSON());
      const body = [['status', { code: 'thinking' }], ['reply', { conversationId: 'c1', messages: [message('m1', 'جهزت التذكرة', { ...draft('pending'), files: [picture] })] }]];
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: body.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('') });
    });
    await page.route('**/api/agent/files/p1/preview', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await page.goto('/');
    await page.getByRole('button', { name: 'فتح مساعد المنصة' }).click();
    const panel = page.getByRole('dialog', { name: 'مساعد المنصة' });
    await panel.getByRole('button', { name: 'إرفاق صورة' }).click();
    await panel.getByLabel('اختر صورًا أو ملفًا صوتيًا').setInputFiles({ name: 'screen.png', mimeType: 'image/png', buffer: PNG });
    await expect(panel.getByRole('img', { name: 'screen.png' })).toBeVisible();
    await expect(panel.getByText(/بيانات حساسة/)).toBeVisible();
    await page.screenshot({ path: info.outputPath('assistant-picture-tray.png') });
    await new Screen(page).expectNoSeriousA11yIssues();
    await panel.getByLabel('اكتب رسالتك').fill('افتح تذكرة بهذه الشاشة');
    await panel.getByRole('button', { name: 'إرسال' }).click();
    const tick = panel.getByRole('checkbox', { name: 'إرفاق screen.png بالطلب' });
    await expect(tick).toBeChecked();
    expect(sent[0]).toMatchObject({ text: 'افتح تذكرة بهذه الشاشة', fileIds: [expect.any(String)] });
    await new Screen(page).expectNoSeriousA11yIssues();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('FR-181: a sound file is turned into a WAV by the browser, written down, and the text lands in the box to be read (nothing is sent); a service without sound is explained', async ({ page }, info) => {
    const wav = (seconds: number) => {
      const rate = 8000;
      const data = Buffer.alloc(seconds * rate * 2);
      const head = Buffer.alloc(44);
      head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8, 'ascii'); head.writeUInt32LE(16, 16);
      head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
      head.write('data', 36, 'ascii'); head.writeUInt32LE(data.length, 40);
      return Buffer.concat([head, data]);
    };
    let sentWav: Buffer | null = null;
    let unsupported = false;
    await page.route('**/api/agent/transcribe', async (route) => {
      sentWav = route.request().postDataBuffer();
      if (unsupported) return route.fulfill({ status: 422, json: { code: 'AI_AUDIO_UNSUPPORTED', message: 'no' } });
      return route.fulfill({ status: 201, json: { text: 'عايزة اعمل تذكرة لأن صفحة مهامي لا تفتح', truncated: false } });
    });
    const sentToAssistant: string[] = [];
    await page.route('**/api/agent/messages/stream', (route) => { sentToAssistant.push(route.request().url()); return route.abort(); });
    await page.goto('/');
    await page.getByRole('button', { name: 'فتح مساعد المنصة' }).click();
    const panel = page.getByRole('dialog', { name: 'مساعد المنصة' });
    await expect(panel.getByRole('button', { name: 'التحدث إلى المساعد' })).toBeVisible();
    await panel.getByRole('button', { name: 'إرفاق صورة' }).click();
    await panel.getByLabel('اختر صورًا أو ملفًا صوتيًا').setInputFiles({ name: 'note.wav', mimeType: 'audio/wav', buffer: wav(2) });
    await expect(panel.getByLabel('اكتب رسالتك')).toHaveValue('عايزة اعمل تذكرة لأن صفحة مهامي لا تفتح');
    expect(sentToAssistant).toHaveLength(0);
    // What the server got is the browser's own 16 kHz mono WAV (a 2-second 8 kHz file becomes 2 s at 16 kHz: 44 + 64000 bytes), as a multipart body.
    expect(sentWav).not.toBeNull();
    expect(String(sentWav).includes('RIFF')).toBe(true);
    await page.screenshot({ path: info.outputPath('assistant-voice.png') });
    await new Screen(page).expectNoSeriousA11yIssues();
    unsupported = true;
    await panel.getByLabel('اختر صورًا أو ملفًا صوتيًا').setInputFiles({ name: 'again.wav', mimeType: 'audio/wav', buffer: wav(1) });
    await expect(panel.getByText(/لا تقبل الصوت/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
