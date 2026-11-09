import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CoverageTab {
  id: string;
  label: string;
}

interface Group {
  section: string;
  tabs: CoverageTab[];
  seen: string[];
}

interface Coverage {
  report: (section: string, group: string, tabs: CoverageTab[], active: string) => void;
}

const CoverageContext = createContext<Coverage | null>(null);

const sameTabs = (a: CoverageTab[], b: CoverageTab[]): boolean => a.length === b.length && a.every((t, i) => t.id === b[i]?.id && t.label === b[i]?.label);

/**
 * While the reader is held by the acknowledgement, which tabs inside each section were opened (a section with sub-tabs, a learning plan with
 * years): the sections report their tabs and the one showing; «Next» waits until every tab of the section was opened. Outside a reading
 * (the path after acknowledging, HR's preview) nothing is provided and nothing is tracked.
 */
export function useReadingCoverage(): { provider: (children: ReactNode) => ReactNode; pending: (section: string) => string[] } {
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const report = useCallback((section: string, group: string, tabs: CoverageTab[], active: string) => {
    setGroups((all) => {
      const before = all[group];
      const seen = before?.seen.includes(active) ? before.seen : [...(before?.seen ?? []), active];
      if (before && sameTabs(before.tabs, tabs) && seen === before.seen) return all;
      return { ...all, [group]: { section, tabs, seen } };
    });
  }, []);
  const value = useMemo(() => ({ report }), [report]);
  const pending = (section: string): string[] =>
    Object.values(groups)
      .filter((g) => g.section === section)
      .flatMap((g) => g.tabs.filter((t) => !g.seen.includes(t.id)).map((t) => t.label));
  return { provider: (children) => <CoverageContext.Provider value={value}>{children}</CoverageContext.Provider>, pending };
}

/** Tells the reading (if there is one) which tabs a section has and which one is showing now. */
export function useTabCoverage(section: string, group: string, tabs: CoverageTab[], active: string): void {
  const coverage = useContext(CoverageContext);
  const key = tabs.map((t) => `${t.id}:${t.label}`).join('|');
  useEffect(() => {
    coverage?.report(section, group, tabs, active);
    // `key` stands for `tabs`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverage, section, group, key, active]);
}
