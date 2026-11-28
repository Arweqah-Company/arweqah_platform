import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const ORIGIN = { origin: 'http://localhost:4173' };
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

/** A ticket the signed-in person sends to the first desk that takes tickets (the API makes it, so the journey starts at the board). */
async function sendTicket(page: Page, title: string): Promise<string> {
  const catalog = (await (await page.request.get('/api/tickets/catalog')).json()) as { desks: { unavailableReason: string | null; types: { id: string; isPersonal: boolean }[] }[] };
  const type = catalog.desks.filter((d) => d.unavailableReason === null).flatMap((d) => d.types).find((t) => !t.isPersonal);
  const made = await page.request.post('/api/tickets', { data: { typeId: type!.id, title }, headers: ORIGIN });
  expect(made.ok()).toBe(true);
  return ((await made.json()) as { id: string }).id;
}

/** A real mouse drag: dnd-kit starts after a few pixels, so the pointer moves in steps. */
async function drag(page: Page, handle: ReturnType<Page['getByRole']>, column: ReturnType<Page['getByRole']>): Promise<void> {
  const from = (await handle.boundingBox())!;
  const to = (await column.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
  await page.mouse.up();
}

test.describe('Moving tickets on the board (FR-227)', () => {
  test('dragging an open ticket to «closed» opens the reply window, closes it without execution, and the card lands in the closed column', async ({ page }) => {
    test.setTimeout(120_000);
    const title = `سحب تذكرة ${Date.now()}`;
    await sendTicket(page, title);
    await page.goto('/tickets');
    await page.getByRole('button', { name: 'لوحة كانبان' }).click();
    const open = page.getByRole('region', { name: 'مفتوحة' });
    const closed = page.getByRole('region', { name: 'مغلقة' });
    await expect(open.getByRole('link', { name: new RegExp(title) })).toBeVisible();
    await drag(page, open.getByRole('button', { name: `اسحب التذكرة «${title}» إلى عمود آخر` }), closed);
    const dialog = page.getByRole('dialog', { name: 'إغلاق دون تنفيذ' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'رسالة (اختيارية)' }).fill('لا حاجة لها');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/close-without-execution'));
    await dialog.getByRole('button', { name: 'إغلاق دون تنفيذ' }).click();
    expect((await answered).ok()).toBe(true);
    await expect(closed.getByRole('link', { name: new RegExp(title) })).toBeVisible();
    await expect(open.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
  });

  test('a drop on a column no action leads to does nothing, and the menu offers only the moves that exist', async ({ page }) => {
    test.setTimeout(120_000);
    const title = `قائمة النقل ${Date.now()}`;
    await sendTicket(page, title);
    await page.goto('/tickets');
    await page.getByRole('button', { name: 'لوحة كانبان' }).click();
    const open = page.getByRole('region', { name: 'مفتوحة' });
    const menu = open.getByLabel(`انقل التذكرة «${title}» إلى`);
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('option')).toHaveCount(3); // «open» (where it is), «waiting for confirmation», «closed»
    await page.keyboard.press('Escape');
    await drag(page, open.getByRole('button', { name: `اسحب التذكرة «${title}» إلى عمود آخر` }), open); // back onto its own column
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
