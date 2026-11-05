import { describe, expect, it } from 'vitest';
import type { TaskViewer } from '../../domain/types/task.types';
import { reachSql } from './task-sql';

const viewer: TaskViewer = { userId: 'me', employeeId: 'e-me', companyId: 'c1', subtreeNodeIds: ['n1', 'n2'], scopes: {} };

describe('reachSql (FR-49, FR-100)', () => {
  it('reaches the direct reports and the units of a unit-based scope', () => {
    const values: unknown[] = [];
    expect(reachSql('subtree', viewer, 'pe', values)).toBe('(pe.manager_id = $1 OR pe.org_node_id = ANY($2))');
    expect(values).toEqual(['e-me', ['n1', 'n2']]);
  });

  it('in a unit managed per company adds the viewer\'s company, and leaves a shared unit open', () => {
    const values: unknown[] = [];
    const sql = reachSql('subtree', { ...viewer, restrictedNodeIds: ['n2'] }, 'pe', values);
    expect(sql).toBe('(pe.manager_id = $1 OR (pe.org_node_id = ANY($2) AND (pe.org_node_id <> ALL($4) OR pe.company_id = $3)))');
    expect(values).toEqual(['e-me', ['n1', 'n2'], 'c1', ['n2']]);
  });
});
