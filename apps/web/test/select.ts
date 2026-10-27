import { fireEvent, waitFor } from '@testing-library/react';

const items = () => Array.from(document.querySelectorAll('[cmdk-item]'));

/** Opens a `Select` popup (the trigger is the labelled button) and clicks the option with this value. */
export async function chooseOption(trigger: HTMLElement, value: string) {
  fireEvent.click(trigger);
  const item = await waitFor(() => {
    const found = items().find((el) => (el.getAttribute('data-value') ?? '').endsWith(` ${value}`));
    if (!found) throw new Error(`no option with value "${value}"`);
    return found;
  });
  fireEvent.click(item);
}

/** The visible texts of the options of a `Select`, read by opening its popup and closing it again. */
export async function optionLabels(trigger: HTMLElement) {
  fireEvent.click(trigger);
  const labels = await waitFor(() => {
    const texts = items().map((el) => el.textContent ?? '');
    if (texts.length === 0) throw new Error('popup not open');
    return texts;
  });
  fireEvent.click(trigger);
  return labels;
}
