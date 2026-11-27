import { CorePermission, type ReactionSummaryDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ReactionBar } from './reaction-bar';

const chip = (over: Partial<ReactionSummaryDto> = {}): ReactionSummaryDto => ({ reaction: 'like', count: 2, mine: false, people: [{ id: 'u1', name: 'منى خالد' }, { id: 'u2', name: 'علي حسن' }], ...over });

function bar(reactions: ReactionSummaryDto[], keys: string[] = [CorePermission.TicketsReplyReact]) {
  server.use(http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))));
  const onReact = vi.fn();
  const onRemove = vi.fn();
  renderPage(<ReactionBar reactions={reactions} permission={CorePermission.TicketsReplyReact} onReact={onReact} onRemove={onRemove} />);
  return { onReact, onRemove };
}

describe('ReactionBar: reactions under a reply (FR-206)', () => {
  it('shows a chip per reaction used with its count, and the names on hover and for screen readers', async () => {
    bar([chip(), chip({ reaction: 'love', count: 25, people: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `شخص ${i}` })) })]);
    const like = await screen.findByRole('button', { name: /إعجاب من منى خالد، علي حسن/ });
    expect(like).toHaveAttribute('title', 'إعجاب من منى خالد، علي حسن');
    expect(like).toHaveTextContent('👍2');
    expect(like).toHaveAttribute('aria-pressed', 'false');
    const love = screen.getByRole('button', { name: /حب من/ });
    expect(love.getAttribute('title')).toContain('و5 آخرين');
  });

  it('marks my own reaction, and clicking it removes it', async () => {
    const { onRemove, onReact } = bar([chip({ mine: true })]);
    const mine = await screen.findByRole('button', { name: /إعجاب/ });
    expect(mine).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mine);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it('clicking a chip I did not use sends that reaction (it replaces mine)', async () => {
    const { onReact } = bar([chip({ mine: true }), chip({ reaction: 'wow', count: 1, people: [{ id: 'u3', name: 'سامي' }] })]);
    fireEvent.click(await screen.findByRole('button', { name: /واو/ }));
    expect(onReact).toHaveBeenCalledWith('wow');
  });

  it('opens the six reactions from the button, sends the chosen one and closes', async () => {
    const { onReact } = bar([]);
    fireEvent.click(await screen.findByRole('button', { name: 'تفاعل' }));
    const group = await screen.findByRole('group', { name: 'اختر تفاعلًا' });
    expect(within(group).getAllByRole('button')).toHaveLength(6);
    expect(within(group).getByRole('button', { name: 'ضحك' })).toHaveTextContent('😂');
    fireEvent.click(within(group).getByRole('button', { name: 'حزن' }));
    expect(onReact).toHaveBeenCalledWith('sad');
    await waitFor(() => expect(screen.queryByRole('group', { name: 'اختر تفاعلًا' })).not.toBeInTheDocument());
  });

  it('choosing my own reaction again in the picker removes it, and the picker marks it', async () => {
    const { onRemove, onReact } = bar([chip({ mine: true, count: 1 })]);
    fireEvent.click(await screen.findByRole('button', { name: 'تفاعل' }));
    const like = within(await screen.findByRole('group', { name: 'اختر تفاعلًا' })).getByRole('button', { name: 'إعجاب' });
    expect(like).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(like);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it('opens from the keyboard and closes with Escape', async () => {
    bar([]);
    const trigger = await screen.findByRole('button', { name: 'تفاعل' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    expect(await screen.findByRole('group', { name: 'اختر تفاعلًا' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('group', { name: 'اختر تفاعلًا' })).not.toBeInTheDocument());
  });

  it('without the key shows who reacted but offers no button and nothing to click', async () => {
    bar([chip()], []);
    expect(await screen.findByRole('img', { name: /إعجاب من منى خالد/ })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('without the key and without reactions renders nothing', async () => {
    bar([], []);
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument());
  });
});
