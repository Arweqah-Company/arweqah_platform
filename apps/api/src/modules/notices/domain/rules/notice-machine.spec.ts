import { NOTICE_STATUSES, type NoticeStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { canHappen, nextStatus, type NoticeEvent } from './notice-machine';

const first = { hasPublished: false };
const again = { hasPublished: true };

describe('The life of a notice (FR-167, FR-176)', () => {
  it('follows the plan: draft, sent, approved, published on its day', () => {
    expect(nextStatus('draft', { type: 'SUBMIT' })).toBe('pending_approval');
    expect(nextStatus('pending_approval', { type: 'APPROVE', ...first })).toBe('approved');
    expect(nextStatus('approved', { type: 'PUBLISH_DUE' })).toBe('published');
    expect(nextStatus('published', { type: 'ARCHIVE', ...first })).toBe('archived');
    expect(nextStatus('draft', { type: 'DELETE' })).toBe('discarded');
  });

  it('has no way from a draft or a pending notice to published except the approval of a new version', () => {
    const events: NoticeEvent[] = [{ type: 'EDIT', ...first }, { type: 'SUBMIT' }, { type: 'APPROVE', ...first }, { type: 'REJECT' }, { type: 'PUBLISH_DUE' }, { type: 'REVISE' }, { type: 'REVISE_CANCEL', ...first }];
    for (const event of events) expect(nextStatus('draft', event) === 'published').toBe(false);
    for (const event of events) expect(nextStatus('pending_approval', event) === 'published').toBe(false);
    expect(nextStatus('pending_approval', { type: 'APPROVE', ...again })).toBe('published');
    expect(nextStatus('draft', { type: 'PUBLISH_DUE' })).toBeNull();
    expect(nextStatus('pending_approval', { type: 'PUBLISH_DUE' })).toBeNull();
  });

  it('sends a rejected notice back to a draft, or to a new version when a version was published before', () => {
    expect(nextStatus('pending_approval', { type: 'REJECT' })).toBe('rejected');
    expect(nextStatus('rejected', { type: 'EDIT', ...first })).toBe('draft');
    expect(nextStatus('rejected', { type: 'EDIT', ...again })).toBe('revising');
  });

  it('hides a published notice while a new version is written, and brings it back when the change is cancelled (only when a version was published)', () => {
    expect(nextStatus('published', { type: 'REVISE' })).toBe('revising');
    expect(nextStatus('revising', { type: 'SUBMIT' })).toBe('pending_approval');
    expect(nextStatus('revising', { type: 'REVISE_CANCEL', ...again })).toBe('published');
    expect(nextStatus('pending_approval', { type: 'REVISE_CANCEL', ...again })).toBe('published');
    expect(nextStatus('rejected', { type: 'REVISE_CANCEL', ...again })).toBe('published');
    expect(nextStatus('pending_approval', { type: 'REVISE_CANCEL', ...first })).toBeNull();
    expect(nextStatus('rejected', { type: 'REVISE_CANCEL', ...first })).toBeNull();
    expect(nextStatus('published', { type: 'REVISE_CANCEL', ...again })).toBeNull();
  });

  it('allows archiving what is published, approved, being revised, or a new version waiting; never a first draft or a first pending notice', () => {
    for (const status of ['published', 'approved', 'revising'] as NoticeStatus[]) expect(canHappen(status, { type: 'ARCHIVE', ...first })).toBe(true);
    expect(canHappen('pending_approval', { type: 'ARCHIVE', ...again })).toBe(true);
    expect(canHappen('pending_approval', { type: 'ARCHIVE', ...first })).toBe(false);
    expect(canHappen('draft', { type: 'ARCHIVE', ...again })).toBe(false);
  });

  it('ends at archived: nothing leaves it', () => {
    const everything: NoticeEvent[] = [{ type: 'EDIT', ...again }, { type: 'SUBMIT' }, { type: 'DELETE' }, { type: 'APPROVE', ...again }, { type: 'REJECT' }, { type: 'PUBLISH_DUE' }, { type: 'REVISE' }, { type: 'REVISE_CANCEL', ...again }, { type: 'ARCHIVE', ...again }];
    for (const event of everything) expect(canHappen('archived', event)).toBe(false);
  });

  it('knows every status of the contract', () => {
    for (const status of NOTICE_STATUSES) expect(() => canHappen(status, { type: 'SUBMIT' })).not.toThrow();
  });
});
