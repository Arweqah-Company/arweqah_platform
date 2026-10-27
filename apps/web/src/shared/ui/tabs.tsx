export interface TabItem<T extends string> {
  id: T;
  label: string;
}

/** A row of tabs (one is selected); the page shows the matching section. */
export function Tabs<T extends string>({ tabs, value, label, onChange }: { tabs: TabItem<T>[]; value: T; label: string; onChange: (id: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 inline-flex flex-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map((x) => (
        <button key={x.id} type="button" role="tab" aria-selected={value === x.id} onClick={() => onChange(x.id)} className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${value === x.id ? 'bg-white text-link shadow-sm' : 'text-muted hover:text-fg'}`}>
          {x.label}
        </button>
      ))}
    </div>
  );
}
