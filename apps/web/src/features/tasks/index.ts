import { CorePermission } from '@arweqah-platform/shared';
import { ListChecks, SlidersHorizontal, Tag } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { MyTasksPanel } from './home/my-tasks-panel';
export { MatrixSection } from './matrix/matrix-section';
export { useTaskSummary } from './api';

export const tasksFeature: FeatureModule = {
  id: 'tasks',
  routes: [
    { path: '/tasks', lazy: () => import('./my-tasks/my-tasks-page').then((m) => ({ Component: m.MyTasksPage })) },
    { path: '/tasks/tags', lazy: () => import('./tags/tags-page').then((m) => ({ Component: m.TagsPage })) },
    { path: '/tasks/policies', lazy: () => import('./policies/policies-page').then((m) => ({ Component: m.PoliciesPage })) },
    { path: '/tasks/:id/conversation', lazy: () => import('./comments/conversation-page').then((m) => ({ Component: m.ConversationPage })) },
    { path: '/tasks/:id', lazy: () => import('./details/task-details-page').then((m) => ({ Component: m.TaskDetailsPage })) },
  ],
  // Every page has its own key (a person sees only the pages they hold); my team is a tab of my tasks and the matrix a section of the home page; the policies page appears only while platform admin mode is on.
  nav: [
    { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks, group: 'tasks', end: true, pageKey: 'tasks', permission: CorePermission.TasksView },
    { to: '/tasks/tags', labelKey: 'nav.taskTags', icon: Tag, group: 'tasks', pageKey: 'task-tags', permission: CorePermission.TasksTagsView },
    { to: '/tasks/policies', labelKey: 'nav.taskPolicies', icon: SlidersHorizontal, group: 'tasks', requiresAdminMode: true, pageKey: 'task-policies', permission: CorePermission.TasksPoliciesView },
  ],
  i18n: { ar, en },
};
