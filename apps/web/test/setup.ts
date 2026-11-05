import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import '../src/core/i18n';
import '../src/app/features';
import { server } from './msw';

// jsdom lacks what Radix popovers and the combobox list rely on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.scrollIntoView = () => undefined;
Element.prototype.scrollTo = () => undefined; // the chart centres itself after Open all / Close all
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;

// ProseMirror (the template editor) measures text with these; jsdom has no layout, so they answer "nothing".
const NO_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) };
Range.prototype.getBoundingClientRect = () => NO_RECT as DOMRect;
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint = () => null;

// CI and turbo run suites in parallel; give async queries room on a busy machine.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
