import { MAX_REACTION_NAMES, type ReactionKey, type ReactionTargetType } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ReactionRepository } from '../../domain/contracts/reaction.repository';
import type { ReactionRow } from '../../domain/types/reaction.types';
import { ReactionsService } from './reactions.service';

class FakeReactions extends ReactionRepository {
  constructor(private readonly all: ReactionRow[]) {
    super();
  }
  put(): Promise<boolean> {
    return Promise.resolve(true);
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  rows(_type: ReactionTargetType, ids: string[]): Promise<ReactionRow[]> {
    return Promise.resolve(this.all.filter((r) => ids.includes(r.targetId)));
  }
}

const row = (targetId: string, userId: string, reaction: ReactionKey): ReactionRow => ({ targetId, userId, name: `name-${userId}`, reaction });

describe('Reaction chips (FR-206)', () => {
  it('groups by reaction in the fixed order, counts, marks the viewer’s own and keeps only targets that have reactions', async () => {
    const service = new ReactionsService(new FakeReactions([row('a', 'u1', 'sad'), row('a', 'u2', 'like'), row('a', 'u3', 'like'), row('b', 'u1', 'wow')]));
    const chips = await service.summaries('ticket_event', ['a', 'b', 'c'], 'u3');
    expect([...chips.keys()]).toEqual(['a', 'b']);
    expect(chips.get('a')).toEqual([
      { reaction: 'like', count: 2, mine: true, people: [{ id: 'u2', name: 'name-u2' }, { id: 'u3', name: 'name-u3' }] },
      { reaction: 'sad', count: 1, mine: false, people: [{ id: 'u1', name: 'name-u1' }] },
    ]);
  });

  it(`names only the first ${MAX_REACTION_NAMES} people of a chip while the count stays complete`, async () => {
    const many = Array.from({ length: MAX_REACTION_NAMES + 5 }, (_, i) => row('a', `u${i}`, 'love'));
    const chip = (await new ReactionsService(new FakeReactions(many)).summaries('task_comment', ['a'], 'nobody')).get('a')![0]!;
    expect(chip.count).toBe(MAX_REACTION_NAMES + 5);
    expect(chip.people).toHaveLength(MAX_REACTION_NAMES);
  });

  it('asks nothing when there are no targets', async () => {
    expect((await new ReactionsService(new FakeReactions([row('a', 'u1', 'like')])).summaries('ticket_event', [], 'u1')).size).toBe(0);
  });
});
