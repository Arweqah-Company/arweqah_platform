import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const def = (key: string, labelAr: string, labelEn: string): PermissionDefinition => ({ key, module: 'tickets', labelAr, labelEn, scopes: ['all'] });

/**
 * A key for the page and one for every action. What a person may do with one ticket still follows their relation to it
 * (sender, assignee, desk manager): the key lets the button exist, the relation says for which tickets.
 */
export const TICKET_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.TicketsView, 'عرض صفحة التذاكر وتفاصيلها', 'View the tickets page and ticket details'),
  def(CorePermission.TicketsCreate, 'إرسال تذكرة جديدة', 'Send a new ticket'),
  def(CorePermission.TicketsReply, 'الرد على التذكرة', 'Reply to a ticket'),
  def(CorePermission.TicketsRequestClose, 'طلب إغلاق التذكرة', 'Ask to close a ticket'),
  def(CorePermission.TicketsConfirmClose, 'اعتماد إغلاق التذكرة (قبول)', 'Approve the closing of a ticket'),
  def(CorePermission.TicketsDeclineClose, 'رفض إغلاق التذكرة', 'Reject the closing of a ticket'),
  def(CorePermission.TicketsCloseWithoutExecution, 'إغلاق التذكرة بلا تنفيذ', 'Close a ticket without executing it'),
  def(CorePermission.TicketsReopen, 'إعادة فتح تذكرة مغلقة', 'Reopen a closed ticket'),
  def(CorePermission.TicketsSetupView, 'عرض صفحة إعداد التذاكر', 'View the ticket setup page'),
  def(CorePermission.TicketsSetupEdit, 'تعديل استقبال الإدارة ومُهَلها', 'Edit a department\'s reception and durations'),
  def(CorePermission.TicketsTypeCreate, 'إضافة نوع تذكرة', 'Add a ticket type'),
  def(CorePermission.TicketsTypeUpdate, 'تعديل نوع تذكرة', 'Edit a ticket type'),
  def(CorePermission.TicketsTypeDelete, 'حذف نوع تذكرة', 'Delete a ticket type'),
  def(CorePermission.TicketsFiguresView, 'عرض صفحة أداء التذاكر', 'View the ticket figures page'),
  def(CorePermission.TicketsAdminister, 'إدارة تذاكر كل الإدارات بدل إداراته فقط', 'Administer the tickets of every department, not only one\'s own'),
];
