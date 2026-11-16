import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const draft = (status: string, result: unknown = null) => ({
  id: 'd1', operationId: 'TicketSetupController.createType', labelAr: 'إضافة نوع تذكرة', labelEn: 'Add a ticket type', summary: 'إضافة النوع «مشكلة تقنية» إلى قسم التقنية',
  values: {}, destructive: false, status, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), result,
});
const message = (id: string, text: string, d: unknown = null) => ({ id, role: 'assistant', text, draft: d, createdAt: new Date().toISOString() });

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
});
