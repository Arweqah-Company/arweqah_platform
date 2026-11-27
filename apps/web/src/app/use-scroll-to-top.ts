import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * A page opens at its top: moving to another route (a menu click, a link) starts at the top of the new page instead of where the
 * last one was scrolled. Only a change of path counts: filters in the address (`?search=…`) keep the place, and a link to a part
 * of a page (`#basic`) scrolls to that part.
 */
export function useScrollToTop(): void {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
}
