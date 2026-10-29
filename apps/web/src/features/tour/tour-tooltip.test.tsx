import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TooltipRenderProps } from 'react-joyride';
import '../../core/i18n';
import { PlayerContext, type TourPlayer } from './tour-context';
import { TourTooltip } from './tour-tooltip';

const props = { step: { title: 'حسابك', content: 'نص الخطوة' }, tooltipProps: { role: 'alertdialog', 'aria-modal': true } } as unknown as TooltipRenderProps;
const player = (over: Partial<TourPlayer> = {}): TourPlayer => ({ index: 1, total: 3, next: vi.fn(), back: vi.fn(), skip: vi.fn(), ...over });
const show = (p: TourPlayer) => render(<PlayerContext.Provider value={p}><TourTooltip {...props} /></PlayerContext.Provider>);

describe('TourTooltip (FR-67)', () => {
  it('names itself by its title, shows the count, and calls the tour’s own actions', () => {
    const p = player();
    show(p);
    expect(screen.getByRole('alertdialog', { name: 'حسابك' })).toBeInTheDocument();
    expect(screen.getByText('2 من 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    fireEvent.click(screen.getByRole('button', { name: 'السابق' }));
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق الجولة' }));
    expect(p.next).toHaveBeenCalledTimes(1);
    expect(p.back).toHaveBeenCalledTimes(1);
    expect(p.skip).toHaveBeenCalledTimes(2);
  });

  it('has no «back» on the first step, and «done» instead of «next» and «skip» on the last', () => {
    show(player({ index: 0 }));
    expect(screen.queryByRole('button', { name: 'السابق' })).not.toBeInTheDocument();
    show(player({ index: 2 }));
    expect(screen.getByRole('button', { name: 'تم' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'تخطّي' })).toHaveLength(1);
  });
});
