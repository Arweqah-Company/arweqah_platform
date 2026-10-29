import { CorePermission } from '@arweqah-platform/shared';
import { ListChecks, SlidersHorizontal, Tag } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
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
  tour: [
    { key: 'tasks', target: PAGE_TITLE_TARGET, route: '/tasks', placement: 'bottom', can: [{ id: 'change_status', permission: CorePermission.TasksChangeStatus }, { id: 'team', permission: CorePermission.TasksTeamView }, { id: 'assign', permission: CorePermission.TasksAssign }, { id: 'approve', permission: CorePermission.TasksApprove }, { id: 'review', permission: CorePermission.TasksReview }, { id: 'object', permission: CorePermission.TasksObject }, { id: 'log_time', permission: CorePermission.TasksLogTime }, { id: 'follow', permission: CorePermission.TasksFollow }, { id: 'comment', permission: CorePermission.TasksCommentAdd }, { id: 'archive', permission: CorePermission.TasksArchiveView }, { id: 'export', permission: CorePermission.TasksExport }] },
    { key: 'task-new', target: '[data-tour="task-new"]', route: '/tasks', placement: 'bottom', can: [{ id: 'assign', permission: CorePermission.TasksAssign }, { id: 'follow', permission: CorePermission.TasksFollow }] },
    { key: 'task-views', target: '[data-tour="view-switch"]', route: '/tasks', placement: 'bottom', can: [{ id: 'change_status', permission: CorePermission.TasksChangeStatus }, { id: 'team', permission: CorePermission.TasksTeamView }, { id: 'team_move', permission: CorePermission.TasksTeamChangeStatus }] },
    { key: 'task-open', target: '[data-tour="first-row"]', route: '/tasks', placement: 'bottom', can: [{ id: 'update', permission: CorePermission.TasksUpdate }, { id: 'log_time', permission: CorePermission.TasksLogTime }, { id: 'comment', permission: CorePermission.TasksCommentAdd }, { id: 'object', permission: CorePermission.TasksObject }] },
  ],
  i18n: { ar, en },
};
