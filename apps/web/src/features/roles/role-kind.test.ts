import { describe, expect, it } from 'vitest';
import { isDerivedRole, roleKind } from './role-kind';

describe('roleKind', () => {
  it('tells where the members of a role come from', () => {
    expect(roleKind({ autoRule: null })).toBe('manual');
    expect(roleKind({ autoRule: 'everyone' })).toBe('rule');
    expect(roleKind({ autoRule: 'has_reports' })).toBe('rule');
    expect(roleKind({ autoRule: 'job_title' })).toBe('jobTitle');
    expect(roleKind({ autoRule: 'node_head' })).toBe('head');
  });

  it('treats only job title and level head roles as following the organization', () => {
    expect(isDerivedRole({ autoRule: 'job_title' })).toBe(true);
    expect(isDerivedRole({ autoRule: 'node_head' })).toBe(true);
    expect(isDerivedRole({ autoRule: 'everyone' })).toBe(false);
    expect(isDerivedRole(null)).toBe(false);
  });
});
