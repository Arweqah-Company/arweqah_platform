import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const WIDE: PermissionDefinition['scopes'] = ['own', 'unit', 'subtree', 'company', 'all'];
const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes'] = ['all']): PermissionDefinition => ({ key, module: 'tickets', labelAr, labelEn, scopes });

/**
 * A key for the page and one for every action. The key lets the button exist; the scope and the relation say for which tickets:
 *  - view: own = the tickets the person sent or handles; unit / unit and below / company / all = also those of the people in that scope;
 *  - reply (and with it asking to close and closing without execution): own = the tickets assigned to them or to their department
 *    as its manager; wider = every ticket of the departments inside that scope;
 *  - setup and figures: own = the units they lead and every unit below them; wider = the units inside that scope (all = every department).
 * Confirming, declining and reopening belong to the sender of the ticket, so they have no scope.
 */
export const TICKET_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.TicketsView, 'عرض صفحة التذاكر وتفاصيلها', 'View the tickets page and ticket details', WIDE),
  def(CorePermission.TicketsCreate, 'إرسال تذكرة جديدة', 'Send a new ticket'),
  def(CorePermission.TicketsReply, 'الرد على التذاكر ومعالجتها (طلب الإغلاق والإغلاق بلا تنفيذ)', 'Reply to and handle tickets (ask to close, close without executing)', WIDE),
  def(CorePermission.TicketsRequestClose, 'طلب إغلاق التذكرة', 'Ask to close a ticket'),
  def(CorePermission.TicketsConfirmClose, 'اعتماد إغلاق التذكرة (قبول)', 'Approve the closing of a ticket'),
  def(CorePermission.TicketsDeclineClose, 'رفض إغلاق التذكرة', 'Reject the closing of a ticket'),
  def(CorePermission.TicketsCloseWithoutExecution, 'إغلاق التذكرة بلا تنفيذ', 'Close a ticket without executing it'),
  def(CorePermission.TicketsReopen, 'إعادة فتح تذكرة مغلقة', 'Reopen a closed ticket'),
  def(CorePermission.TicketsCommentReply, 'الرد على رد داخل التذكرة', 'Answer a reply inside a ticket'),
  def(CorePermission.TicketsCommentMention, 'ذكر موظف بـ @ في ردّ على تذكرة', 'Mention a colleague with @ in a ticket reply'),
  def(CorePermission.TicketsSetupView, 'عرض صفحة إعداد التذاكر', 'View the ticket setup page', WIDE),
  def(CorePermission.TicketsSetupEdit, 'تعديل استقبال الجهة ومُهَلها', 'Edit a unit\'s reception and durations', WIDE),
  def(CorePermission.TicketsTypeCreate, 'إضافة نوع تذكرة', 'Add a ticket type', WIDE),
  def(CorePermission.TicketsTypeUpdate, 'تعديل نوع تذكرة', 'Edit a ticket type', WIDE),
  def(CorePermission.TicketsTypeDelete, 'حذف نوع تذكرة', 'Delete a ticket type', WIDE),
  def(CorePermission.TicketsFiguresView, 'عرض صفحة أداء التذاكر', 'View the ticket figures page', WIDE),
];
