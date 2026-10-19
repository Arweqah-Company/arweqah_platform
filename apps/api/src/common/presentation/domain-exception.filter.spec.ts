import { NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BusinessRuleError, ConflictError, NotFoundError } from '../domain/domain-error';
import { DomainExceptionFilter } from './domain-exception.filter';

function run(exception: unknown) {
  let status = 0;
  let body: Record<string, unknown> = {};
  const res = { status: (s: number) => ((status = s), res), json: (b: Record<string, unknown>) => (body = b) };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new DomainExceptionFilter().catch(exception, host);
  return { status, body };
}

describe('DomainExceptionFilter', () => {
  it.each([
    [new NotFoundError('User', '1'), 404, 'NOT_FOUND'],
    [new ConflictError('dup'), 409, 'CONFLICT'],
    [new BusinessRuleError('no'), 422, 'BUSINESS_RULE'],
    [new NotFoundException(), 404, 'NOT_FOUND'],
  ])('maps %s', (error, status, code) => {
    expect(run(error)).toMatchObject({ status, body: { code } });
  });

  it('hides internals of unexpected errors', () => {
    const { status, body } = run(new Error('relation "users" does not exist at SELECT ...'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('users');
  });
});
