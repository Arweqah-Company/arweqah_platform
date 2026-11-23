import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes']): PermissionDefinition => ({ key, module: 'notices', labelAr, labelEn, scopes });

const OWN: PermissionDefinition['scopes'] = ['own'];
const UNITS: PermissionDefinition['scopes'] = ['own', 'subtree', 'all'];
const HEADS: PermissionDefinition['scopes'] = ['subtree', 'all'];
const WRITERS: PermissionDefinition['scopes'] = ['subtree', 'company', 'all'];

/**
 * A key for every page and every action (standing rule 5). What a scope reaches:
 *  - view / acknowledge / export_mine: own = the notices that reached the person;
 *  - manage_view, archive, ack_report, ack_export, export: own = the notices of the channels the person writes in, subtree = also those written by people of their unit and
 *    below, all = every notice. The report of acknowledgements narrows to the people of the unit and below for a unit head;
 *  - create, edit, delete, submit, revise, revise_cancel: always the person's own notices (and only in a channel they write in);
 *  - approve_view, approve, reject: the notices written inside the unit and below (never the person's own);
 *  - the writer and channel keys: the channels of the unit and below (a channel is checked against its own unit), of the company, or of every unit.
 */
export const NOTICE_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.NoticesView, 'عرض التعاميم التي وصلتني', 'View the notices that reached me', OWN),
  def(CorePermission.NoticesAcknowledge, 'الإقرار بسياسة', 'Acknowledge a policy', OWN),
  def(CorePermission.NoticesExportMine, 'تصدير تعاميمي', 'Export my notices', OWN),
  def(CorePermission.NoticesManageView, 'عرض صفحة إدارة التعاميم وتفاصيلها', 'View the notices management page and notice details', UNITS),
  def(CorePermission.NoticesCreate, 'كتابة تعميم جديد', 'Write a new notice', OWN),
  def(CorePermission.NoticesEdit, 'تعديل مسودة أو تعميم مرفوض', 'Edit a draft or a rejected notice', OWN),
  def(CorePermission.NoticesDelete, 'حذف مسودة', 'Delete a draft', OWN),
  def(CorePermission.NoticesSubmit, 'إرسال التعميم للاعتماد', 'Send a notice for approval', OWN),
  def(CorePermission.NoticesApproveView, 'عرض صفحة بانتظار اعتمادي', 'View the page of notices waiting for my approval', HEADS),
  def(CorePermission.NoticesApprove, 'اعتماد تعميم', 'Approve a notice', HEADS),
  def(CorePermission.NoticesReject, 'رفض تعميم بسبب', 'Reject a notice with a reason', HEADS),
  def(CorePermission.NoticesPin, 'تثبيت تعميم في الرئيسية أو فك تثبيته', 'Pin a notice on the home page or unpin it', ['company', 'all']),
  def(CorePermission.NoticesArchive, 'أرشفة تعميم', 'Archive a notice', UNITS),
  def(CorePermission.NoticesRevise, 'تعديل تعميم منشور بإصدار جديد', 'Change a published notice with a new version', OWN),
  def(CorePermission.NoticesReviseCancel, 'إلغاء التعديل وإعادة الإصدار المنشور', 'Cancel the change and bring back the published version', OWN),
  def(CorePermission.NoticesAckReport, 'عرض من أقرّ ومن لم يقرّ', 'See who acknowledged and who did not', UNITS),
  def(CorePermission.NoticesAckExport, 'تصدير قائمة الإقرارات', 'Export the list of acknowledgements', UNITS),
  def(CorePermission.NoticesExport, 'تصدير قوائم إدارة التعاميم والاعتماد', 'Export the notices management and approval lists', UNITS),
  def(CorePermission.NoticesChannelsView, 'عرض صفحة قنوات النشر', 'View the publishing channels page', WRITERS),
  def(CorePermission.NoticesWriterAdd, 'إضافة كاتب إلى قناة وحدة', 'Add a writer to the channel of a unit', WRITERS),
  def(CorePermission.NoticesWriterRemove, 'إزالة كاتب من قناة وحدة', 'Remove a writer from the channel of a unit', WRITERS),
  def(CorePermission.NoticesChannelAdd, 'إنشاء قناة نشر لوحدة وتغيير اسمها', 'Create a publishing channel for a unit and rename it', WRITERS),
  def(CorePermission.NoticesChannelRemove, 'تعطيل قناة نشر وتفعيلها وحذفها', 'Disable, enable and delete a publishing channel', WRITERS),
  def(CorePermission.NoticesSettingsEdit, 'تعديل إعدادات النشر على دفعات', 'Edit the batch publishing settings', ['all']),
  def(CorePermission.NoticesChannelsExport, 'تصدير قائمة كتّاب القنوات', 'Export the list of channel writers', WRITERS),
];
