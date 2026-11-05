import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './segmented-control';
import { ToneBadge } from './tone-badge';
import { TreeChart, type ChartItem } from './tree-chart';

const items: ChartItem[] = [
  { id: 'root', parentId: null, title: 'المجموعة', tone: 'ink' },
  { id: 'a', parentId: 'root', title: 'قطاع', badge: 'قطاع', tone: 'petrol' },
  { id: 'b', parentId: 'a', title: 'مكتب', badge: 'مكتب', tone: 'beige', faded: true, searchText: 'OPS.09' },
];

describe('TreeChart opened to a depth, faded units and extra search words', () => {
  it('starts with the root open only when asked, closes everything but the root, and opens the way to a match on the extra words', () => {
    render(<TreeChart items={items} selectedId={null} onSelect={() => undefined} label="مخطط" openDepth={1} query="" />);
    expect(screen.getByText('قطاع', { selector: 'span.line-clamp-2' })).toBeInTheDocument();
    expect(screen.queryByText('مكتب', { selector: 'span.line-clamp-2' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'فتح الكل' }));
    expect(screen.getByText('مكتب', { selector: 'span.line-clamp-2' }).closest('button')).toHaveClass('border-dashed');
    fireEvent.click(screen.getByRole('button', { name: 'طي الكل' }));
    expect(screen.getByText('قطاع', { selector: 'span.line-clamp-2' })).toBeInTheDocument(); // the root stays open
    expect(screen.queryByText('مكتب', { selector: 'span.line-clamp-2' })).not.toBeInTheDocument();
  });

  it('opens the way to a unit found by its code, which is not in its title', () => {
    render(<TreeChart items={items} selectedId={null} onSelect={() => undefined} label="مخطط" openDepth={1} query="ops.09" />);
    expect(screen.getByText('مكتب', { selector: 'span.line-clamp-2' })).toBeInTheDocument();
  });
});

describe('ToneBadge and SegmentedControl', () => {
  it('writes the type in text on its colour', () => {
    render(<ToneBadge tone="beige">مكتب</ToneBadge>);
    expect(screen.getByText('مكتب')).toHaveClass('bg-beige-300');
  });

  it('marks the chosen state with aria-pressed and reports a change', () => {
    const seen: string[] = [];
    render(<SegmentedControl label="العرض" value="a" onChange={(id) => seen.push(id)} choices={[{ id: 'a', label: 'أ' }, { id: 'b', label: 'ب' }]} />);
    expect(screen.getByRole('button', { name: 'أ' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'ب' }));
    expect(seen).toEqual(['b']);
  });
});
