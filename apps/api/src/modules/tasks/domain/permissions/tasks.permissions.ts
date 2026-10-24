import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const WIDE: PermissionDefinition['scopes'] = ['own', 'unit', 'subtree', 'company', 'all'];
const TEAM: PermissionDefinition['scopes'] = ['unit', 'subtree', 'company', 'all'];
const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes'] = ['all']): PermissionDefinition => ({ key, module: 'tasks', labelAr, labelEn, scopes });

/**
 * A key for every page and every button. For the keys that reach other people the scope says how far:
 * own = the person alone (or their own department's tags); unit = their direct reports; unit and below = everyone below them in the
 * structure; company and all = wider. The key lets the button exist; the relation to the task and the scope say for which tasks.
 */
export const TASK_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.TasksView, 'عرض صفحة مهامي وتفاصيل المهمة', 'View my tasks and task details', ['own']),
  def(CorePermission.TasksTeamView, 'عرض صفحة مهام الفريق', 'View the team tasks page', TEAM),
  def(CorePermission.TasksMatrixView, 'عرض مصفوفة المهام', 'View the task matrix', WIDE),
  def(CorePermission.TasksCreate, 'إنشاء مهمة جديدة', 'Create a task'),
  def(CorePermission.TasksAssign, 'إسناد مهمة لشخص آخر', 'Assign a task to another person', TEAM),
  def(CorePermission.TasksUpdate, 'تعديل بيانات المهمة', 'Edit a task', WIDE),
  def(CorePermission.TasksChangeStatus, 'تغيير حالة مهامي (سحب أو زر)', 'Change the status of my tasks', ['own']),
  def(CorePermission.TasksTeamChangeStatus, 'تغيير حالة مهام الفريق', 'Change the status of team tasks', TEAM),
  def(CorePermission.TasksApprove, 'اعتماد مهمة ذاتية', 'Approve a self-assigned task', TEAM),
  def(CorePermission.TasksReject, 'رفض مهمة ذاتية', 'Reject a self-assigned task', TEAM),
  def(CorePermission.TasksReview, 'مراجعة إنجاز المهمة (قبول أو رفض)', 'Review the completion of a task (accept or send back)'),
  def(CorePermission.TasksReopen, 'إعادة فتح مهمة مكتملة', 'Reopen a finished task', WIDE),
  def(CorePermission.TasksResubmit, 'إعادة إرسال مهمة مرفوضة للاعتماد', 'Resubmit a rejected task for approval'),
  def(CorePermission.TasksObject, 'الاعتراض على مهمة أُسندت لي', 'Object to a task given to me'),
  def(CorePermission.TasksFollow, 'متابعة مهمة', 'Follow a task'),
  def(CorePermission.TasksLogTime, 'تسجيل ساعات العمل على مهمة', 'Log time on a task'),
  def(CorePermission.TasksArchiveView, 'عرض المهام المؤرشفة', 'View archived tasks', WIDE),
  def(CorePermission.TasksRestore, 'استرجاع مهمة مؤرشفة', 'Restore an archived task', WIDE),
  def(CorePermission.TasksExport, 'تصدير قوائم المهام', 'Export task lists'),
  def(CorePermission.TasksTagsView, 'عرض صفحة فئات المهام', 'View the task tags page', WIDE),
  def(CorePermission.TasksTagCreate, 'إضافة فئة مهام', 'Add a task tag', WIDE),
  def(CorePermission.TasksTagUpdate, 'تعديل فئة مهام', 'Edit a task tag', WIDE),
  def(CorePermission.TasksTagDelete, 'حذف فئة مهام', 'Delete a task tag', WIDE),
  def(CorePermission.TasksPoliciesView, 'عرض صفحة سياسات المهام', 'View the task policies page'),
  def(CorePermission.TasksPoliciesEdit, 'تعديل سياسات المهام', 'Edit the task policies'),
];
