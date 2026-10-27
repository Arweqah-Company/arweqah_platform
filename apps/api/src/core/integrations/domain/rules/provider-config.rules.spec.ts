import { describe, expect, it } from 'vitest';
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
