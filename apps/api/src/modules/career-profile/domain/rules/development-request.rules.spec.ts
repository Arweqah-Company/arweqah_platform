import { describe, expect, it } from 'vitest';
import { budgetLeft, budgetYear, chainFor, isOverBudget, levelAbove, resolveApprover } from './development-request.rules';

describe('chainFor (FR-116)', () => {
  it.each([
    [0, 'in', 'direct'], [5000, 'in', 'direct'], [5001, 'in', 'sector'], [20000, 'in', 'sector'], [20001, 'in', 'ceo'],
    [100, 'out', 'sector'], [20000, 'out', 'sector'], [20001, 'out', 'ceo'],
  ] as const)('cost %i %s goes to %s', (cost, plan, level) => expect(chainFor(cost, plan)).toBe(level));
});

describe('levelAbove', () => {
  it('walks up and stops at the CEO', () => {
    expect(levelAbove('direct')).toBe('sector');
    expect(levelAbove('sector')).toBe('ceo');
    expect(levelAbove('ceo')).toBeNull();
  });
});

describe('resolveApprover', () => {
  const users = { direct: 'm', sector: 's', ceo: 'c' };
  it('takes the wanted level', () => expect(resolveApprover('sector', users, 'e')).toEqual({ level: 'sector', userId: 's' }));
  it('goes up when the post is empty', () => expect(resolveApprover('direct', { ...users, direct: null }, 'e')).toEqual({ level: 'sector', userId: 's' }));
  it('goes up when the holder is the requester', () => expect(resolveApprover('sector', users, 's')).toEqual({ level: 'ceo', userId: 'c' }));
  it('is null when nobody is above', () => expect(resolveApprover('ceo', { direct: null, sector: null, ceo: 'e' }, 'e')).toBeNull());
});

describe('budget', () => {
  it('leaves the cap minus the spent, never below zero', () => {
    expect(budgetLeft(3000, 1800)).toBe(1200);
    expect(budgetLeft(3000, 3500)).toBe(0);
    expect(budgetLeft(null, 10)).toBeNull();
  });
  it('warns above what is left and never without a cap', () => {
    expect(isOverBudget(1201, 3000, 1800)).toBe(true);
    expect(isOverBudget(1200, 3000, 1800)).toBe(false);
    expect(isOverBudget(99999, null, 0)).toBe(false);
  });
});

describe('budgetYear', () => {
  it('runs from the first instant of January in Riyadh to the first of the next year', () => {
    const { from, to } = budgetYear('2026-11-09');
    expect(from.toISOString()).toBe('2025-12-31T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-31T21:00:00.000Z');
  });
});
