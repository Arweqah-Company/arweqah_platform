import type { CareerContent } from '@arweqah-platform/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../../test/render';
import { LadderGraph } from './ladder-graph';

const step = (level: CareerContent['ladder'][number]['level'], title: string, current = false) => ({ level, title, current });
/** The ladder of «مهندس برمجيات أول» as a file may list it: from the top down. */
const TOP_DOWN = [step('L1', 'الرئيس التنفيذي'), step('L3', 'مدير إدارة'), step('L5', 'مهندس معماري حلول'), step('L6', 'مهندس برمجيات أول', true), step('L7', 'مهندس برمجيات')];

describe('The career ladder shows the way it is climbed (FR-111)', () => {
  it('starts with the entry level whatever order the content lists, and ends with the top', () => {
    renderPage(<LadderGraph ladder={TOP_DOWN} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((i) => within(i).getByText(/^L\d$/).textContent)).toEqual(['L7', 'L6', 'L5', 'L3', 'L1']);
  });

  it('puts «you are here» on the current title and «next level» on the one above it, not on the one below', () => {
    renderPage(<LadderGraph ladder={TOP_DOWN} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(within(items[1] as HTMLElement).getByText('أنت هنا')).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText('المستوى التالي ↑')).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).queryByText('المستوى التالي ↑')).not.toBeInTheDocument();
  });

  it('leaves a ladder that is already in order as it is', () => {
    renderPage(<LadderGraph ladder={[step('L7', 'مهندس برمجيات'), step('L6', 'مهندس برمجيات أول', true), step('L5', 'مهندس معماري حلول')]} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((i) => within(i).getByText(/^L\d$/).textContent)).toEqual(['L7', 'L6', 'L5']);
  });
});
