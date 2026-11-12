import { describe, expect, it } from 'vitest';
import { FEATURES } from '@/app/features';
import ar from './content/manual.ar.json';
import en from './content/manual.en.json';
import { plainText, visibleSections, type ManualSection } from './docs-access';

const section = (over: Partial<ManualSection>): ManualSection => ({ id: 'x', group: 0, title: 'T', permissions: [], page: null, adminMode: false, blocks: [], ...over });

describe('visibleSections (the manual shows each person only the pages they may open)', () => {
  const all = [section({ id: 'open' }), section({ id: 'tasks', permissions: ['tasks.view'], page: 'tasks' }), section({ id: 'roles', permissions: ['roles.view'], page: 'roles' })];

  it('shows sections without a permission to everyone', () => {
    expect(visibleSections(all, () => false, []).map((s) => s.id)).toEqual(['open']);
  });
  it('shows a section when the person holds its permission', () => {
    expect(visibleSections(all, (p) => p === 'tasks.view', []).map((s) => s.id)).toEqual(['open', 'tasks']);
  });
  it('hides a section whose page an administrator hid from the person', () => {
    expect(visibleSections(all, () => true, ['tasks']).map((s) => s.id)).toEqual(['open', 'roles']);
  });
  it('finds words in a section for the search box', () => {
    const s = section({ title: 'Tickets', blocks: [{ table: { head: [['Field']], rows: [[[{ code: 'tickets.create' }]]] } }] });
    expect(plainText(s)).toContain('tickets.create');
  });
});

describe('the manual follows the navigation of the app', () => {
  const nav = FEATURES.flatMap((f) => f.nav ?? []);
  it('has the same sections in both languages', () => {
    expect(ar.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
  });
  it('a section tied to a page the menu gates with a permission carries that permission', () => {
    for (const s of en.sections) {
      const item = nav.find((n) => n.pageKey && n.pageKey === s.page);
      if (item?.permission) expect(s.permissions, s.id).toContain(item.permission);
    }
  });
});
