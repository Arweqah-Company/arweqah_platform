import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollToTop } from './use-scroll-to-top';

function Page() {
  useScrollToTop();
  return null;
}

const scrollTo = vi.fn();
afterEach(() => scrollTo.mockReset());

function open(start: string) {
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  const router = createMemoryRouter([{ path: '*', element: <Page /> }], { initialEntries: [start] });
  render(<RouterProvider router={router} />);
  scrollTo.mockReset();
  return router;
}

describe('FR-203: a page opens at its top', () => {
  it('goes to the top when the person moves to another page', async () => {
    const router = open('/profile');
    await router.navigate('/employees');
    await vi.waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' }));
  });

  it('keeps the place when only the filters in the address change', async () => {
    const router = open('/employees');
    await router.navigate('/employees?search=sara');
    await new Promise((r) => setTimeout(r, 30));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves a link to a part of the page (#basic) to the browser', async () => {
    const router = open('/profile');
    await router.navigate('/profile#basic');
    await new Promise((r) => setTimeout(r, 30));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
