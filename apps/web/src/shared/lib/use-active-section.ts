import { useEffect, useState } from 'react';

/** Distance from the top of the window at which a section counts as "the one being read" (below the floating header). */
const READING_LINE = 120;

/** The section the reader is in, for a menu that highlights it. Sections that are not on the page are skipped. */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(',');

  useEffect(() => {
    const present = key.split(',').filter((id) => document.getElementById(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      // The last section may be too short to ever reach the reading line: at the end of the page it is the current one.
      const reached = present.filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= READING_LINE);
      setActive(atBottom ? present.at(-1) : (reached.at(-1) ?? present[0]));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}
