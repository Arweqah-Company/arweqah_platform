import { describe, expect, it } from 'vitest';
import { formFrom, formProblems, toSent } from './form-values';

describe('provider form values', () => {
  it('starts from the saved plain fields and defaults, never from a secret', () => {
    const form = formFrom('aws', { accessKeyId: 'AKIA', secretAccessKey: 'hidden', region: 'eu-west-1' });
    expect(form).toEqual({ values: { accessKeyId: 'AKIA', region: 'eu-west-1' }, secrets: {} });
    expect(formFrom('aws', {}).values).toEqual({ region: 'us-east-1' });
  });

  it('sends cleared plain fields as null and a secret only when it was typed', () => {
    expect(toSent('aws', { values: { accessKeyId: '', region: 'us-east-1' }, secrets: { secretAccessKey: '  ' } })).toEqual({ accessKeyId: null, region: 'us-east-1' });
    expect(toSent('aws', { values: { accessKeyId: 'A', region: 'r' }, secrets: { secretAccessKey: ' s3cret ' } })).toMatchObject({ secretAccessKey: 's3cret' });
  });

  it('counts a saved secret as filled, and reports missing and wrong fields', () => {
    expect(formProblems('aws', { values: { accessKeyId: 'A', region: 'r' }, secrets: {} }, ['secretAccessKey'])).toEqual({ missing: [], invalid: [] });
    expect(formProblems('aws', { values: { accessKeyId: 'A', region: 'r' }, secrets: {} }, [])).toEqual({ missing: ['secretAccessKey'], invalid: [] });
    expect(formProblems('sendgrid', { values: { from: 'nobody' }, secrets: { apiKey: 'k' } }, [])).toEqual({ missing: [], invalid: ['from'] });
    expect(formProblems('google', { values: {}, secrets: { serviceAccountJson: '{"client_email":"a@b.c"}' } }, []).invalid).toEqual(['serviceAccountJson']);
  });
});
