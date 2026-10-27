import type { Locator } from '@playwright/test';

/** Opens a `Select` / `Combobox` popup and clicks the option with this name. */
export async function choose(trigger: Locator, name: string | RegExp) {
  await trigger.click();
  await trigger.page().getByRole('option', { name }).click();
}
