import { TOUR_STEPS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../app/features';

type Bundle = { tour?: Record<string, { title?: string; body?: string; can?: Record<string, string> }> };
const owned = FEATURES.flatMap((f) => (f.tour ?? []).map((ui) => ({ ui, id: f.id, i18n: f.i18n })));

/** Standing rule 9: a step in the catalog is pointed at by exactly one feature and worded in both languages, with every «can» line. */
describe('Welcome tour coverage (FR-67)', () => {
  it('has a web step for every catalog step, and no web step the catalog does not know', () => {
    expect(owned.map((o) => o.ui.key).sort()).toEqual(TOUR_STEPS.map((s) => s.key as string).sort());
  });

  it.each(owned.map((o) => [o.ui.key, o] as const))('words «%s» in Arabic and English, with a line for each thing a person can do', (key, o) => {
    for (const lang of ['ar', 'en'] as const) {
      const text = (o.i18n?.[lang] as Bundle).tour?.[key];
      expect(text?.title, `${lang} title`).toBeTruthy();
      expect(text?.body, `${lang} body`).toBeTruthy();
      for (const c of o.ui.can ?? []) expect(text?.can?.[c.id], `${lang} can.${c.id}`).toBeTruthy();
    }
  });

  it('points every step at an element a feature or the shell marks with data-tour, or at a page title', () => {
    for (const { ui } of owned) expect(ui.target === 'body' || ui.target.startsWith('[data-tour=')).toBe(true);
  });
});
