import { beforeEach, describe, expect, it } from 'vitest';
import { diagnosticsSnapshot, recordFailedRequest, recordScreenError, resetDiagnostics } from '@/core/api/problem-diagnostics';
import { buildProblemContext } from './problem-context';
import { dataUrlToBlob, isPrivate, viewportStyle } from './capture-screenshot';

describe('What a problem report says about the screen (FR-199)', () => {
  beforeEach(() => resetDiagnostics());

  it('keeps the last five failed calls and errors, drops the query string and never keeps a body', () => {
    for (let i = 0; i < 7; i += 1) recordFailedRequest('GET', `/tickets?search=secret-${i}`, 500);
    for (let i = 0; i < 7; i += 1) recordScreenError(`error ${i}`);
    const { failedRequests, errors } = diagnosticsSnapshot();
    expect(failedRequests).toHaveLength(5);
    expect(failedRequests[0]).toEqual({ method: 'GET', path: '/tickets', status: 500 });
    expect(JSON.stringify(failedRequests)).not.toContain('secret');
    expect(errors).toEqual(['error 2', 'error 3', 'error 4', 'error 5', 'error 6']);
  });

  it('builds the context from the window and the page', () => {
    document.title = 'التذاكر';
    recordFailedRequest('POST', '/tickets', 422);
    const context = buildProblemContext('ar');
    expect(context).toMatchObject({ pageTitle: 'التذاكر', language: 'ar', theme: 'light', failedRequests: [{ method: 'POST', path: '/tickets', status: 422 }] });
    expect(context.viewport).toMatch(/^\d+x\d+$/);
    expect(buildProblemContext('en').language).toBe('en');
  });

  it('leaves password fields and anything marked private out of a screenshot', () => {
    const password = Object.assign(document.createElement('input'), { type: 'password' });
    const marked = document.createElement('div');
    marked.dataset.private = '';
    expect(isPrivate(password)).toBe(true);
    expect(isPrivate(marked)).toBe(true);
    const corner = document.createElement('button');
    corner.dataset.noScreenshot = '';
    expect(isPrivate(corner)).toBe(true);
    expect(isPrivate(document.createElement('div'))).toBe(false);
    expect(isPrivate(document.createTextNode('x'))).toBe(false);
  });

  it('reads the bytes of a data URL without a network call', async () => {
    const blob = dataUrlToBlob(`data:image/jpeg;base64,${btoa('abc')}`);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(3);
  });

  it('draws the page from where the person scrolled to, so the picture shows what they were looking at', () => {
    expect(viewportStyle(0, 0)).toEqual({ transform: 'translate(0px, 0px)', transformOrigin: 'top left' });
    expect(viewportStyle(10, 840)).toEqual({ transform: 'translate(-10px, -840px)', transformOrigin: 'top left' });
  });
});
