import { describe, expect, it } from 'vitest';
import type { TaskViewer } from '../types/task.types';
import { inReach } from './task-reach.rules';

const viewer: TaskViewer = { userId: 'me', employeeId: 'e-me', companyId: 'c1', subtreeNodeIds: ['n1', 'n2'], scopes: {} };
const person = (over: Partial<{ userId: string; managerEmployeeId: string | null; orgNodeId: string | null; companyId: string | null }> = {}) => ({ userId: 'x', managerEmployeeId: null, orgNodeId: 'n9', companyId: 'c1', ...over });

describe('Task reach by scope (FR-49)', () => {
  it('reaches nobody without the key', () => {
    expect(inReach(null, viewer, person({ userId: 'me' }))).toBe(false);
  });

  it('own is the person alone', () => {
    expect(inReach('own', viewer, person({ userId: 'me' }))).toBe(true);
    expect(inReach('own', viewer, person({ managerEmployeeId: 'e-me' }))).toBe(false);
  });

  it('unit is the direct reports', () => {
    expect(inReach('unit', viewer, person({ managerEmployeeId: 'e-me' }))).toBe(true);
    expect(inReach('unit', viewer, person({ orgNodeId: 'n1' }))).toBe(false);
  });

  it('unit and below is the direct reports and everybody in the subtree', () => {
    expect(inReach('subtree', viewer, person({ orgNodeId: 'n2' }))).toBe(true);
    expect(inReach('subtree', viewer, person({ managerEmployeeId: 'e-me', orgNodeId: 'n9' }))).toBe(true);
    expect(inReach('subtree', viewer, person({ orgNodeId: 'n9' }))).toBe(false);
  });

  it('company stops at the company, all reaches everyone', () => {
    expect(inReach('company', viewer, person())).toBe(true);
    expect(inReach('company', viewer, person({ companyId: 'c2' }))).toBe(false);
    expect(inReach('all', viewer, person({ companyId: 'c2' }))).toBe(true);
  });

  it('a depth scope reaches the units that depth gives, besides the direct reports (FR-80)', () => {
    const deep: TaskViewer = { ...viewer, reachNodes: { 'subtree:1': ['n1', 'n2'] } };
    expect(inReach('subtree:1', deep, person({ orgNodeId: 'n2' }))).toBe(true);
    expect(inReach('subtree:1', deep, person({ orgNodeId: 'n3' }))).toBe(false);
    expect(inReach('subtree:1', deep, person({ managerEmployeeId: 'e-me', orgNodeId: 'n9' }))).toBe(true);
  });

  it('in a unit managed per company a unit-based scope reaches only the viewer\'s company; a shared unit reaches everyone (FR-100)', () => {
    const restricted: TaskViewer = { ...viewer, restrictedNodeIds: ['n2'] };
    expect(inReach('subtree', restricted, person({ orgNodeId: 'n2', companyId: 'c1' }))).toBe(true);
    expect(inReach('subtree', restricted, person({ orgNodeId: 'n2', companyId: 'c2' }))).toBe(false);
    expect(inReach('subtree', restricted, person({ orgNodeId: 'n1', companyId: 'c2' }))).toBe(true);
    expect(inReach('subtree', restricted, person({ orgNodeId: 'n2', companyId: 'c2', managerEmployeeId: 'e-me' }))).toBe(true); // a direct report stays one
  });
});
