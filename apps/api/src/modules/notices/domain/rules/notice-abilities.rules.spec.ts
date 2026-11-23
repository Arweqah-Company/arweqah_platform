import { CorePermission, type NoticeStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { abilitiesFor, type AbilityFacts } from './notice-abilities.rules';

const keys = (held: string[], reaching: string[] = held) => ({ has: (k: string) => held.includes(k), reaches: (k: string) => reaching.includes(k) });
const facts = (status: NoticeStatus, extra: Partial<AbilityFacts> = {}): AbilityFacts => ({ status, hasPublished: false, isAuthor: true, isPinned: false, ...extra });
const WRITER = [CorePermission.NoticesEdit, CorePermission.NoticesSubmit, CorePermission.NoticesDelete, CorePermission.NoticesRevise, CorePermission.NoticesReviseCancel, CorePermission.NoticesArchive];

describe('The icons of a notice row (FR-167, FR-171, FR-176)', () => {
  it('gives a writer edit, send and delete on their draft, and nothing else', () => {
    expect(abilitiesFor(facts('draft'), keys(WRITER))).toEqual({ edit: true, submit: true, delete: true, revise: false, reviseCancel: false, approve: false, reject: false, pin: false, unpin: false, archive: false });
  });

  it('gives the writer of a published notice the new-version icon, and of a notice being revised the cancel icon', () => {
    expect(abilitiesFor(facts('published', { hasPublished: true }), keys(WRITER))).toMatchObject({ revise: true, edit: false, reviseCancel: false, archive: true });
    expect(abilitiesFor(facts('revising', { hasPublished: true }), keys(WRITER))).toMatchObject({ edit: true, submit: true, reviseCancel: true, revise: false });
    expect(abilitiesFor(facts('pending_approval', { hasPublished: true }), keys(WRITER))).toMatchObject({ reviseCancel: true });
    expect(abilitiesFor(facts('pending_approval'), keys(WRITER))).toMatchObject({ reviseCancel: false });
  });

  it('shows nothing of the writer\'s icons to somebody else, even with the keys', () => {
    expect(abilitiesFor(facts('draft', { isAuthor: false }), keys(WRITER))).toMatchObject({ edit: false, submit: false, delete: false });
  });

  it('lets a head decide on what waits, never on their own notice, and only inside the reach of the keys', () => {
    const head = [CorePermission.NoticesApprove, CorePermission.NoticesReject];
    expect(abilitiesFor(facts('pending_approval', { isAuthor: false }), keys(head))).toMatchObject({ approve: true, reject: true });
    expect(abilitiesFor(facts('pending_approval'), keys(head))).toMatchObject({ approve: false, reject: false });
    expect(abilitiesFor(facts('pending_approval', { isAuthor: false }), keys(head, []))).toMatchObject({ approve: false });
    expect(abilitiesFor(facts('draft', { isAuthor: false }), keys(head))).toMatchObject({ approve: false });
  });

  it('pins a published notice that is not pinned, unpins a pinned one', () => {
    expect(abilitiesFor(facts('published', { isAuthor: false }), keys([CorePermission.NoticesPin]))).toMatchObject({ pin: true, unpin: false });
    expect(abilitiesFor(facts('published', { isAuthor: false, isPinned: true }), keys([CorePermission.NoticesPin]))).toMatchObject({ pin: false, unpin: true });
    expect(abilitiesFor(facts('draft', { isAuthor: false }), keys([CorePermission.NoticesPin]))).toMatchObject({ pin: false });
  });
});
