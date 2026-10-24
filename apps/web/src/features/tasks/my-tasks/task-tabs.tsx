import { TASK_TABS, type TaskTab } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

/** The tabs of my tasks: assigned to me, assigned by me, following, and (for those who may) my team. */
export type TasksTab = TaskTab | 'team';

export function TaskTabs({ tab, withTeam, onChange }: { tab: TasksTab; withTeam: boolean; onChange: (tab: TasksTab) => void }) {
  const { t } = useTranslation('tasks');
  const tabs: TasksTab[] = withTeam ? [...TASK_TABS, 'team'] : [...TASK_TABS];
  return (
    <div role="tablist" aria-label={t('tabsLabel')} className="mb-4 inline-flex flex-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map((x) => (
        <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => onChange(x)} className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${tab === x ? 'bg-white text-link shadow-sm' : 'text-muted hover:text-fg'}`}>
          {t(`tabs.${x}`)}
        </button>
      ))}
    </div>
  );
}
