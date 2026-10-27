import { TASK_TABS, type TaskTab } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Tabs } from '@/shared/ui';

/** The tabs of my tasks: assigned to me, assigned by me, following, and (for those who may) my team. */
export type TasksTab = TaskTab | 'team';

export function TaskTabs({ tab, withTeam, onChange }: { tab: TasksTab; withTeam: boolean; onChange: (tab: TasksTab) => void }) {
  const { t } = useTranslation('tasks');
  const tabs: TasksTab[] = withTeam ? [...TASK_TABS, 'team'] : [...TASK_TABS];
  return <Tabs tabs={tabs.map((id) => ({ id, label: t(`tabs.${id}`) }))} value={tab} label={t('tabsLabel')} onChange={onChange} />;
}
