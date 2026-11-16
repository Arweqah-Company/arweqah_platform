import { describe, expect, it } from 'vitest';
import { promptUser } from './agent.prompt';

describe('The assistant prompt (FR-144)', () => {
  it('never carries the number the employee typed, in this message or in the earlier ones', () => {
    const user = promptUser([], [{ role: 'user', text: 'my id is 1234567890' }, { role: 'assistant', text: 'ok' }, { role: 'user', text: 'and SA0380000000608010167519' }], []);
    expect(user).not.toContain('1234567890');
    expect(user).not.toContain('SA0380000000608010167519');
    expect(user).toContain('[hidden number]');
  });
});
