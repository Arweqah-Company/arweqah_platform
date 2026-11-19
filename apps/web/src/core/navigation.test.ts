import { Home } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { NavItem } from './feature';
import { buildNavEntries } from './navigation';

const item = (to: string, group?: NavItem['group']): NavItem => ({ to, labelKey: `nav.${to}`, icon: Home, group });

describe('Sidebar entries (FR-166)', () => {
  it('shows a menu that holds one page as that page, with no second click', () => {
    const entries = buildNavEntries([item('/', undefined), item('/tickets', 'tickets')]);
    expect(entries).toEqual([
      { kind: 'link', item: expect.objectContaining({ to: '/' }) },
      { kind: 'link', item: expect.objectContaining({ to: '/tickets' }) },
    ]);
  });

  it('keeps a menu with two or more pages, in the order its first page appears', () => {
    const entries = buildNavEntries([item('/tasks', 'tasks'), item('/tickets', 'tickets'), item('/tasks/tags', 'tasks')]);
    expect(entries.map((e) => (e.kind === 'group' ? `${e.id}:${e.items.length}` : e.item.to))).toEqual(['tasks:2', '/tickets']);
  });
});
