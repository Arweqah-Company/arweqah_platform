import { describe, expect, it } from 'vitest';
import { toEmployeesQuery } from './employees-filters';

describe('toEmployeesQuery (FR-72)', () => {
  it('turns the «needs placement» toggle into the API query, and leaves it out when it is off', () => {
    expect(toEmployeesQuery({ needsPlacement: 'true' })).toMatchObject({ needsPlacement: true });
    expect(toEmployeesQuery({})).toMatchObject({ needsPlacement: undefined });
    expect(toEmployeesQuery({ needsPlacement: 'false' }).needsPlacement).toBeUndefined();
  });

  it('keeps the unit and title only while a company is chosen', () => {
    expect(toEmployeesQuery({ orgNodeId: 'n1' }).orgNodeId).toBeUndefined();
    expect(toEmployeesQuery({ companyId: 'c1', orgNodeId: 'n1', jobTitleId: 't1' })).toMatchObject({ orgNodeId: 'n1', jobTitleId: 't1' });
  });
});
