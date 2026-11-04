import { describe, expect, it } from 'vitest';
import { isTeammate, profileLevel } from './directory.rules';

const none = { canOpenRecord: false, isSelf: false, isInManagerChain: false };

describe('The level of a colleague profile in the directory (FR-92)', () => {
  it('gives a colleague the basics', () => expect(profileLevel(none)).toBe('basic'));
  it('gives the person and their managers more', () => {
    expect(profileLevel({ ...none, isSelf: true })).toBe('extended');
    expect(profileLevel({ ...none, isInManagerChain: true })).toBe('extended');
  });
  it('gives the whole record to who may open it', () => expect(profileLevel({ ...none, canOpenRecord: true, isInManagerChain: true })).toBe('full'));
});

describe('Who is a teammate in «My team» (FR-92)', () => {
  const me = { id: 'a', orgNodeId: 'u1' };
  it('is another person of the very same unit', () => expect(isTeammate(me, { id: 'b', orgNodeId: 'u1' })).toBe(true));
  it('is not the viewer, another unit, a system account, or anyone when the viewer has no unit', () => {
    expect(isTeammate(me, { id: 'a', orgNodeId: 'u1' })).toBe(false);
    expect(isTeammate(me, { id: 'b', orgNodeId: 'u2' })).toBe(false);
    expect(isTeammate(me, { id: 'b', orgNodeId: 'u1', isSystemAccount: true })).toBe(false);
    expect(isTeammate({ id: 'a', orgNodeId: null }, { id: 'b', orgNodeId: null })).toBe(false);
  });
});
