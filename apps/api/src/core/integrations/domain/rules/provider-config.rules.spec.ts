import { describe, expect, it } from 'vitest';
import { providerProblems } from '@arweqah-platform/shared';
import { changedFields, mergeValues, redactSecrets } from './provider-config.rules';

describe('provider data rules', () => {
  it('keeps only the provider\'s own fields and fills defaults', () => {
    expect(mergeValues('aws', {}, { accessKeyId: ' AKIA ', secretAccessKey: 's3cret-value', unknown: 'x' })).toEqual({ accessKeyId: 'AKIA', secretAccessKey: 's3cret-value', region: 'us-east-1' });
  });

  it('keeps a saved secret when the form sends it blank or null, and clears a plain field sent as null', () => {
    const stored = { accessKeyId: 'AKIA', secretAccessKey: 's3cret-value', region: 'eu-west-1' };
    expect(mergeValues('aws', stored, { secretAccessKey: '', accessKeyId: null })).toEqual({ secretAccessKey: 's3cret-value', region: 'eu-west-1' });
    expect(mergeValues('aws', stored, { secretAccessKey: null })).toMatchObject({ secretAccessKey: 's3cret-value' });
  });

  it('leaves a field alone when the form does not mention it', () => {
    expect(mergeValues('smtp', { host: 'a', port: 25, from: 'x@y.sa' }, { host: 'b' })).toMatchObject({ host: 'b', port: 25, from: 'x@y.sa' });
  });

  it('turns numbers and booleans typed as text into their types', () => {
    expect(mergeValues('smtp', {}, { host: 'a', port: '2525', secure: 'true' })).toMatchObject({ port: 2525, secure: true });
  });

  it('names the fields that changed without showing values', () => {
    expect(changedFields('aws', { region: 'a', accessKeyId: 'k' }, { region: 'b', accessKeyId: 'k' })).toEqual(['region']);
  });

  it('hides every secret value from an error message and shortens it', () => {
    const message = redactSecrets('aws', { accessKeyId: 'AKIA1234', secretAccessKey: 'topsecret99' }, 'Bad topsecret99 and topsecret99 again, AKIA1234');
    expect(message).toBe('Bad *** and *** again, AKIA1234');
    expect(redactSecrets('aws', {}, 'x'.repeat(900))).toHaveLength(500);
  });
});

describe('the address of an AI service (FR-126)', () => {
  const problems = (baseUrl: string) => providerProblems('compatible', { apiKey: 'k-12345678', baseUrl, model: 'm' }).invalid;

  it('FR-126: accepts a public https address, with or without a path and a trailing slash', () => {
    expect(problems('https://generativelanguage.googleapis.com/v1beta/openai')).toEqual([]);
    expect(problems('https://api.groq.com/openai/v1/')).toEqual([]);
    expect(problems('https://openrouter.ai/api/v1')).toEqual([]);
  });

  it('FR-126: refuses http, a local name, an IP number (the cloud metadata address, a private one), an IPv6 literal and credentials in the address', () => {
    for (const bad of ['http://api.groq.com/v1', 'https://localhost/v1', 'https://app.localhost/v1', 'https://db.internal/v1', 'https://intranet/v1', 'https://169.254.169.254/latest', 'https://10.0.0.5/v1', 'https://127.0.0.1:8080/v1', 'https://2130706433/v1', 'https://[::1]/v1', 'https://user:pass@api.groq.com/v1', 'not a url']) {
      expect(problems(bad), bad).toEqual(['baseUrl']);
    }
  });

  it('FR-126: the free option is complete out of the box except for its key', () => {
    expect(mergeValues('compatible', {})).toEqual({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' });
    expect(providerProblems('compatible', mergeValues('compatible', {}))).toEqual({ missing: ['apiKey'], invalid: [] });
  });
});
