import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SectionsNav } from './sections-nav';

/** Puts the sections in the page with the given distance from the top of the window. */
function placeSections(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    const el = document.getElementById(id) ?? document.body.appendChild(Object.assign(document.createElement('section'), { id }));
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
  }
}
const scroll = () => act(() => { window.dispatchEvent(new Event('scroll')); return new Promise((r) => requestAnimationFrame(() => r(undefined))); });

afterEach(() => { document.body.innerHTML = ''; });

describe('Form sections menu (FR-17)', () => {
  it('highlights the section being read and follows the scroll', async () => {
    placeSections({ work: 0, contact: 500, personal: 1000, contract: 1500, notes: 2000 });
    render(<SectionsNav sensitive={false} />);
    const current = () => document.querySelector('a[aria-current="location"]')?.getAttribute('href');
    expect(current()).toBe('#work');
    placeSections({ work: -700, contact: -200, personal: 300, contract: 800, notes: 1300 });
    await scroll();
    expect(current()).toBe('#contact');
    placeSections({ work: -2000, contact: -1500, personal: -1000, contract: -500, notes: 100 });
    await scroll();
    expect(current()).toBe('#notes');
  });

  it('lists the salary section only for those who may see sensitive data', () => {
    const { rerender } = render(<SectionsNav sensitive={false} />);
    expect(document.querySelector('a[href="#salary"]')).toBeNull();
    rerender(<SectionsNav sensitive />);
    expect(document.querySelector('a[href="#salary"]')).not.toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });
});
