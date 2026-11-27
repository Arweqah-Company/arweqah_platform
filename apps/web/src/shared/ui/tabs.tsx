import { Badge } from './badge';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  /** A `data-tour` mark for the welcome tour. */
  tour?: string;
  /** A count badge after the label (left out when 0 or missing). */
  count?: number;
}

/** A row of tabs (one is selected); the page shows the matching section. */
/** `panelId` (when the tabs switch what one area shows) ties the selected tab to that area: give the area `role="tabpanel"`, this id, and `aria-labelledby={tabId(value)}`. */
export const tabId = (id: string): string => `tab-${id}`;

export function Tabs<T extends string>({ tabs, value, label, onChange, panelId }: { tabs: TabItem<T>[]; value: T; label: string; onChange: (id: T) => void; panelId?: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 inline-flex flex-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map((x) => (
        <button key={x.id} id={tabId(x.id)} type="button" role="tab" data-tour={x.tour} aria-selected={value === x.id} aria-controls={value === x.id ? panelId : undefined} onClick={() => onChange(x.id)} className={`inline-flex items-center gap-2 rounded-[var(--radius-button)] px-5 py-2 text-sm font-medium transition-colors ${value === x.id ? 'bg-white text-link shadow-sm' : 'text-muted hover:text-fg'}`}>
          {x.label}
          {!!x.count && <Badge tone="warning">{x.count}</Badge>}
        </button>
      ))}
    </div>
  );
}
