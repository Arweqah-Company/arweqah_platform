import { updateEmployeeSchema } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, toPayload } from './form-state';

describe('Employee form payload (FR-17)', () => {
  const filled = { ...EMPTY_FORM, roleIds: ['3f1d6c1e-6f43-4a58-9d6a-6f0b6a7c1b11'] };

  it('sends the roles when an employee is added', () => {
    expect(toPayload(filled)).toHaveProperty('roleIds', filled.roleIds);
  });

  it('leaves the roles out when an employee is edited: the update refuses the key (it would answer "some fields are invalid" with no field)', () => {
    const payload = toPayload(filled, true);
    expect(payload).not.toHaveProperty('roleIds');
    const rejected = updateEmployeeSchema.safeParse({ ...payload, roleIds: filled.roleIds });
    expect(rejected.success).toBe(false);
    expect(rejected.error?.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
  });
});
