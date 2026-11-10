/**
 * What the audit log means to a person. The database and the code keep the technical action name (`task.moved`); the
 * screens show the text below and the category it belongs to, never the name. One list drives the API (filter by category,
 * search by text) and the web (labels, filter options).
 */
export const AUDIT_CATEGORIES = ['sign_in', 'employees', 'organization', 'access', 'tickets', 'tasks', 'settings', 'other'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, { ar: string; en: string }> = {
  sign_in: { ar: 'الدخول والأمان', en: 'Sign-in and security' },
  employees: { ar: 'الموظفون', en: 'Employees' },
  organization: { ar: 'الهيكل التنظيمي والشركات', en: 'Organization and companies' },
  access: { ar: 'الأدوار والصلاحيات', en: 'Roles and permissions' },
  tickets: { ar: 'التذاكر', en: 'Tickets' },
  tasks: { ar: 'المهام', en: 'Tasks' },
  settings: { ar: 'إعدادات النظام', en: 'System settings' },
  other: { ar: 'أخرى', en: 'Other' },
};

interface AuditAction {
  category: AuditCategory;
  ar: string;
  en: string;
}

const a = (category: AuditCategory, ar: string, en: string): AuditAction => ({ category, ar, en });

export const AUDIT_ACTIONS: Record<string, AuditAction> = {
  'auth.sign_in': a('sign_in', 'تسجيل دخول', 'Signed in'),
  'auth.mfa.verified': a('sign_in', 'أدخل رمز التطبيق بنجاح', 'Verified the authenticator code'),
  'auth.code.failed': a('sign_in', 'أدخل رمز تطبيق خاطئًا', 'Entered a wrong authenticator code'),
  'auth.authenticator.enabled': a('sign_in', 'ربط تطبيق المصادقة', 'Linked the authenticator app'),
  'auth.authenticator.reset': a('sign_in', 'أعاد ضبط تطبيق المصادقة لموظف', 'Reset an employee’s authenticator app'),
  'auth.admin_mode.enabled': a('sign_in', 'شغّل وضع الإدارة', 'Turned admin mode on'),
  'auth.admin_mode.disabled': a('sign_in', 'أوقف وضع الإدارة', 'Turned admin mode off'),
  'auth.admin_mode.expired': a('sign_in', 'انتهى وضع الإدارة تلقائيًا', 'Admin mode ended by itself'),

  'employee.created': a('employees', 'أضاف موظفًا', 'Added an employee'),
  'employee.updated': a('employees', 'عدّل بيانات موظف', 'Edited an employee'),
  'employee.invited': a('employees', 'أرسل دعوة تفعيل لموظف', 'Sent an activation invitation'),
  'employee.activated': a('employees', 'فعّل حساب موظف', 'Activated an employee’s account'),
  'employee.deactivated': a('employees', 'أوقف حساب موظف', 'Deactivated an employee’s account'),
  'employee.deactivated.contract_ended': a('employees', 'أُوقف حساب موظف لانتهاء عقده', 'An account was deactivated because the contract ended'),
  'employee.terminated': a('employees', 'أنهى خدمة موظف', 'Ended an employee’s service'),
  'employee.assignment.changed': a('employees', 'غيّر وحدة موظف أو مسماه أو مديره بتاريخ سريان', 'Changed an employee’s unit, job title or manager from a date'),
  'employee.assignment.applied': a('employees', 'سرى تغيير مؤجل لوحدة موظف أو مسماه أو مديره', 'A waiting change of unit, job title or manager took effect'),
  'employee.assignment.cancelled': a('employees', 'ألغى تغييرًا مؤجلًا لوحدة موظف أو مسماه أو مديره', 'Cancelled a waiting change of unit, job title or manager'),
  'employee.bulk_updated': a('employees', 'أجرى تعديلًا جماعيًا على موظفين', 'Edited many employees at once'),
  'employee.photo.changed': a('employees', 'غيّر صورة موظف', 'Changed an employee’s photo'),
  'employee.photo.removed': a('employees', 'أزال صورة موظف', 'Removed an employee’s photo'),
  'employee.roles.changed': a('employees', 'غيّر أدوار موظف', 'Changed an employee’s roles'),
  'employee.groups.changed': a('employees', 'غيّر مجموعات موظف', 'Changed an employee’s groups'),
  'profile.updated': a('employees', 'عدّل ملفه الشخصي', 'Edited their own profile'),

  'company.created': a('organization', 'أضاف شركة', 'Added a company'),
  'company.updated': a('organization', 'عدّل شركة', 'Edited a company'),
  'company.deleted': a('organization', 'حذف شركة', 'Deleted a company'),
  'org.unit.created': a('organization', 'أضاف وحدة تنظيمية', 'Added an organizational unit'),
  'org.unit.updated': a('organization', 'عدّل وحدة تنظيمية', 'Edited an organizational unit'),
  'org.unit.moved': a('organization', 'نقل وحدة تنظيمية', 'Moved an organizational unit'),
  'org.unit.deleted': a('organization', 'حذف وحدة تنظيمية', 'Deleted an organizational unit'),
  'career.content.saved': a('organization', 'حفظ محتوى المسار الوظيفي لمسمى', 'Saved the career-path content of a job title'),
  'career.content.file_uploaded': a('organization', 'رفع ملف المسمى لمحتوى المسار الوظيفي', 'Uploaded the title file of a career path'),
  'career.content.file_analysed_ai': a('organization', 'حلّل ملف مسمى بالذكاء الاصطناعي', 'Analysed a title file with AI'),
  'career.acknowledged': a('organization', 'أقرّ بمساره الوظيفي', 'Acknowledged their career path'),
  'career.acknowledgement.reopened': a('organization', 'أعاد فتح الإقرار بالمسار الوظيفي لشاغلي مسمى', 'Reopened the acknowledgement of a career path for a title\'s holders'),
  'career.learning_links.imported': a('organization', 'استورد روابط وحدات التعلم من ملف', 'Imported learning-unit links from a file'),
  'career.content.published': a('organization', 'عيّن المسار الوظيفي لمسمى جاهزًا', 'Set the career path of a job title ready'),
  'career.proof.submitted': a('organization', 'رفع إثباتًا لوحدة تعلم', 'Submitted a proof for a learning unit'),
  'career.proof.approved': a('organization', 'اعتمد إثبات وحدة تعلم', 'Approved the proof of a learning unit'),
  'career.proof.rejected': a('organization', 'رفض إثبات وحدة تعلم', 'Rejected the proof of a learning unit'),
  'career.proof.referred': a('organization', 'أحال إثبات وحدة تعلم إلى المدير المباشر', 'Referred a proof to the direct manager'),
  'career.required.ticked': a('organization', 'علّم بندًا من المطلوب بأنه تم', 'Marked a required item as done'),
  'career.request.submitted': a('organization', 'قدّم طلب تطوير', 'Submitted a development request'),
  'career.request.approved': a('organization', 'اعتمد طلب تطوير', 'Approved a development request'),
  'career.request.rejected': a('organization', 'رفض طلب تطوير', 'Rejected a development request'),
  'career.request.escalated': a('organization', 'صُعِّد طلب تطوير إلى مدير القطاع لانقضاء المهلة', 'A development request went up to the sector head after the deadline'),
  'career.competency.recorded': a('organization', 'سجّل مستوى جدارة لموظف', 'Recorded the level of a competency for an employee'),
  'performance.template.saved': a('organization', 'رفع ملف التقييم (قوالب المراحل وسلم الدرجات وبطاقة السنة)', 'Uploaded the evaluation file (stage templates, grade scale, fiscal card)'),
  'performance.cycle.opened': a('organization', 'فتح دورة التقييم', 'Opened the evaluation cycle'),
  'performance.cycle.advanced': a('organization', 'نقل دورة التقييم إلى المرحلة التالية', 'Moved the evaluation cycle to the next stage'),
  'performance.cycle.closed': a('organization', 'أغلق دورة التقييم', 'Closed the evaluation cycle'),
  'performance.cycle.date_set': a('organization', 'عدّل موعد مرحلة في دورة التقييم', 'Changed the date of a stage of the evaluation cycle'),
  'performance.reminder.created': a('organization', 'أضاف تذكيرًا تلقائيًا لدورة التقييم', 'Added an automatic reminder of the evaluation cycle'),
  'performance.reminder.updated': a('organization', 'عدّل تذكيرًا تلقائيًا لدورة التقييم', 'Changed an automatic reminder of the evaluation cycle'),
  'performance.reminder.removed': a('organization', 'حذف تذكيرًا تلقائيًا لدورة التقييم', 'Removed an automatic reminder of the evaluation cycle'),
  'performance.template.file_ai': a('organization', 'حلّل ملف التقييم بالذكاء الاصطناعي', 'Analysed the evaluation file with AI'),
  'performance.template.stage_saved': a('organization', 'حفظ قالب مرحلة تقييم', 'Saved the template of an evaluation stage'),
  'performance.template.stage_removed': a('organization', 'حذف قالب مرحلة تقييم', 'Removed the template of an evaluation stage'),
  'performance.template.scale_saved': a('organization', 'عدّل سلم الدرجات', 'Changed the grade scale'),
  'performance.template.fiscal_saved': a('organization', 'عدّل بطاقة السنة المالية', 'Changed the fiscal-year card'),
  'performance.catalog.added': a('organization', 'أضاف بندًا إلى كتالوج المكوّن الإضافي', 'Added an item to the extra-component catalog'),
  'performance.catalog.removed': a('organization', 'حذف بندًا من كتالوج المكوّن الإضافي', 'Removed an item from the extra-component catalog'),
  'performance.team.saved': a('organization', 'حفظ مسودة تقييم موظف', 'Saved a draft evaluation of an employee'),
  'performance.team.sent': a('organization', 'أرسل تقييم موظف', 'Sent the evaluation of an employee'),
  'performance.calibration.adjusted': a('organization', 'عدّل درجة موظف في المعايرة', 'Adjusted the score of an employee in calibration'),
  'performance.calibration.finished': a('organization', 'أنهى المعايرة وأرسلها للاعتماد', 'Finished calibration and sent it to approval'),
  'performance.team.edited': a('organization', 'عدّل تقييم موظف بعد إرساله', 'Changed the evaluation of an employee after sending it'),
  'performance.self.sent': a('organization', 'أرسل تقييمه الذاتي', 'Sent their self-evaluation'),
  'performance.self.edited': a('organization', 'عدّل تقييمه الذاتي بعد إرساله', 'Changed their self-evaluation after sending it'),
  'career.content.drafted': a('organization', 'أرجع المسار الوظيفي لمسمى إلى مسودة', 'Set the career path of a job title back to draft'),
  'org.levels.changed': a('organization', 'غيّر مستويات الهيكل', 'Changed the structure levels'),
  'org.levels.copied': a('organization', 'نسخ مستويات الهيكل من شركة أخرى', 'Copied the structure levels from another company'),

  'role.created': a('access', 'أضاف دورًا', 'Added a role'),
  'role.updated': a('access', 'عدّل دورًا', 'Edited a role'),
  'access.exception_revoked': a('access', 'سحب استثناءً', 'Took an exception back'),
  'access.exception_expiry_changed': a('access', 'غيّر تاريخ انتهاء استثناء', 'Changed the end date of an exception'),
  'access.exception_expired': a('access', 'انتهى استثناء وسُحب تلقائيًا', 'An exception ended and was taken back'),
  'employee.access_restored': a('employees', 'أعاد دخول موظف بعد تعديل تاريخ نهاية تعاقده', 'Gave an employee their sign-in back after the end date changed'),
  'auth.session_ended': a('sign_in', 'أنهى جلسة دخول', 'Ended a sign-in session'),
  'auth.sessions_ended': a('sign_in', 'أنهى جلساته الأخرى', 'Ended their other sign-in sessions'),
  'auth.trusted_device.added': a('sign_in', 'وثّق جهازًا', 'Trusted a device'),
  'auth.trusted_device.removed': a('sign_in', 'ألغى توثيق جهاز', 'Stopped trusting a device'),
  'auth.trusted_device.used': a('sign_in', 'دخل من جهاز موثوق دون رمز', 'Skipped the code on a trusted device'),
  'security.email_domains_updated': a('settings', 'عدّل نطاقات البريد المسموحة', 'Edited the allowed e-mail domains'),
  'impersonation.started': a('sign_in', 'دخل بحساب موظف آخر (دخول كـ)', 'Signed in as another employee'),
  'impersonation.ended': a('sign_in', 'أنهى الدخول بحساب موظف آخر', 'Ended signing in as another employee'),
  'security.settings_updated': a('settings', 'عدّل إعدادات الأمان', 'Edited the security settings'),
  'audit.chain_broken': a('other', 'اكتُشف عبث في سجل التدقيق', 'Tampering with the audit log was found'),
  'role.auto_synced': a('access', 'حدّث أعضاء الأدوار التلقائية', 'Refreshed the members of the automatic roles'),
  'role.deleted': a('access', 'حذف دورًا', 'Deleted a role'),
  'role.pages_updated': a('access', 'غيّر الصفحات المخفية عن دور', 'Changed the pages hidden from a role'),
  'role_group.created': a('access', 'أضاف مجموعة أدوار', 'Added a group of roles'),
  'role_group.updated': a('access', 'عدّل مجموعة أدوار', 'Edited a group of roles'),
  'role_group.deleted': a('access', 'حذف مجموعة أدوار', 'Deleted a group of roles'),
  'user_group.created': a('access', 'أضاف مجموعة أشخاص', 'Added a group of people'),
  'user_group.updated': a('access', 'عدّل مجموعة أشخاص', 'Edited a group of people'),
  'user_group.deleted': a('access', 'حذف مجموعة أشخاص', 'Deleted a group of people'),
  'permissions.updated': a('access', 'غيّر الصلاحيات الممنوحة', 'Changed the granted permissions'),

  'ticket.created': a('tickets', 'أنشأ تذكرة', 'Created a ticket'),
  'ticket.replied': a('tickets', 'ردّ على تذكرة', 'Replied to a ticket'),
  'ticket.close_requested': a('tickets', 'طلب إغلاق تذكرة', 'Asked to close a ticket'),
  'ticket.close_declined': a('tickets', 'رفض إغلاق تذكرة', 'Declined to close a ticket'),
  'ticket.confirmed': a('tickets', 'أكّد إغلاق تذكرة', 'Confirmed the closing of a ticket'),
  'ticket.closed_not_executed': a('tickets', 'أغلق تذكرة دون تنفيذ', 'Closed a ticket without carrying it out'),
  'ticket.auto_closed': a('tickets', 'أُغلقت تذكرة تلقائيًا', 'A ticket was closed automatically'),
  'ticket.reopened': a('tickets', 'أعاد فتح تذكرة', 'Reopened a ticket'),
  'ticket.personal.reassigned': a('tickets', 'أعاد إسناد تذكرة شخصية', 'Reassigned a personal ticket'),
  'ticket.desk.updated': a('tickets', 'عدّل إعدادات استقبال وحدة للتذاكر', 'Edited a unit’s ticket reception settings'),
  'ticket.type.created': a('tickets', 'أضاف نوع تذكرة', 'Added a ticket type'),
  'ticket.type.updated': a('tickets', 'عدّل نوع تذكرة', 'Edited a ticket type'),
  'ticket.type.removed': a('tickets', 'حذف نوع تذكرة', 'Removed a ticket type'),

  'task.created': a('tasks', 'أنشأ مهمة', 'Created a task'),
  'task.updated': a('tasks', 'عدّل مهمة', 'Edited a task'),
  'task.moved': a('tasks', 'نقل مهمة إلى حالة أخرى', 'Moved a task to another status'),
  'task.approved': a('tasks', 'اعتمد مهمة', 'Approved a task'),
  'task.rejected': a('tasks', 'رفض مهمة', 'Rejected a task'),
  'task.resubmitted': a('tasks', 'أعاد إرسال مهمة للاعتماد', 'Sent a task for approval again'),
  'task.objected': a('tasks', 'اعترض على مهمة', 'Objected to a task'),
  'task.objection_answered': a('tasks', 'ردّ على اعتراض على مهمة', 'Answered an objection to a task'),
  'task.objection_expired': a('tasks', 'انتهت مهلة اعتراض على مهمة', 'The time to object to a task ran out'),
  'task.time_logged': a('tasks', 'سجّل وقت عمل على مهمة', 'Logged time on a task'),
  'task.archived': a('tasks', 'أرشف مهمة', 'Archived a task'),
  'task.restored': a('tasks', 'استعاد مهمة من الأرشيف', 'Restored a task from the archive'),
  'task.handed_over': a('tasks', 'سلّم مهام موظف لغيره', 'Handed an employee’s tasks to someone else'),
  'task.handover_skipped': a('tasks', 'تعذّر تسليم بعض المهام', 'Some tasks could not be handed over'),
  'task.tag.created': a('tasks', 'أضاف فئة للمهام', 'Added a task category'),
  'task.tag.updated': a('tasks', 'عدّل فئة للمهام', 'Edited a task category'),
  'task.tag.removed': a('tasks', 'حذف فئة للمهام', 'Removed a task category'),
  'task.policy.updated': a('tasks', 'عدّل سياسة المهام', 'Edited the task policy'),
  'task.comment_added': a('tasks', 'كتب تعليقًا على مهمة', 'Wrote a comment on a task'),
  'task.comment_edited': a('tasks', 'عدّل تعليقًا على مهمة', 'Edited a comment on a task'),
  'task.comment_deleted': a('tasks', 'حذف تعليقًا على مهمة', 'Deleted a comment on a task'),
  'task.comment_rules_changed': a('tasks', 'عدّل صلاحيات التعليقات على المهام', 'Changed who may comment on tasks'),

  'integration.saved': a('settings', 'حفظ بيانات خدمة (ترجمة أو بريد)', 'Saved a service’s data (translation or e-mail)'),
  'integration.tested': a('settings', 'جرّب خدمة (ترجمة أو بريد)', 'Tried a service (translation or e-mail)'),
  'integration.activated': a('settings', 'فعّل خدمة (ترجمة أو بريد)', 'Switched a service on (translation or e-mail)'),
  'captcha.unavailable': a('settings', 'تعذّر الوصول إلى خدمة الحماية من الروبوتات فسُمح بالدخول', 'The bot protection service was unreachable and sign-in was allowed'),
  'integration.deactivated': a('settings', 'أوقف خدمة (ترجمة أو بريد)', 'Switched a service off (translation or e-mail)'),
  'template.saved': a('settings', 'عدّل صياغة رسالة (بريد أو إشعار)', 'Edited the wording of a message (e-mail or notification)'),
  'template.submitted': a('settings', 'قدّم تعديل رسالة للاعتماد', 'Submitted a message change for approval'),
  'template.approved': a('settings', 'اعتمد تعديل رسالة', 'Approved a message change'),
  'template.rejected': a('settings', 'رفض تعديل رسالة', 'Rejected a message change'),
  'template.reset': a('settings', 'أعاد رسالة إلى صياغتها الأصلية', 'Reset a message to its default wording'),
  'template.settings_changed': a('settings', 'غيّر إعداد اعتماد تعديلات الرسائل', 'Changed the approval setting for message changes'),
  'tour.step_edited': a('settings', 'عدّل خطوة في جولة الترحيب', 'Edited a welcome-tour step'),
  'tour.step_reset': a('settings', 'أعاد خطوة في جولة الترحيب إلى نصّها الأصلي', 'Reset a welcome-tour step to its default wording'),
  'tour.reordered': a('settings', 'غيّر ترتيب خطوات جولة الترحيب', 'Reordered the welcome-tour steps'),
  'list.settings_updated': a('settings', 'عدّل أعمدة قائمة وفلاترها', 'Edited a list’s columns and filters'),
};

const PREFIX_CATEGORY: Record<string, AuditCategory> = { auth: 'sign_in', employee: 'employees', profile: 'employees', company: 'organization', org: 'organization', role: 'access', role_group: 'access', user_group: 'access', permissions: 'access', ticket: 'tickets', task: 'tasks', tasks: 'tasks', integration: 'settings', list: 'settings', template: 'settings', tour: 'settings' };

/** The category of an action; one the list does not know yet falls back to its first word, then to "other". */
export function categoryOfAction(action: string): AuditCategory {
  return AUDIT_ACTIONS[action]?.category ?? PREFIX_CATEGORY[action.split('.')[0] ?? ''] ?? 'other';
}

/** The sentence a person reads for an action, in the language asked for; an unknown action reads as its category's name. */
export function auditActionText(action: string, lang: 'ar' | 'en'): string {
  const known = AUDIT_ACTIONS[action];
  return known ? known[lang] : AUDIT_CATEGORY_LABELS[categoryOfAction(action)][lang];
}

/** LIKE patterns of the first words that put an unlisted action in the category (`ticket.%`). */
export function prefixPatterns(category?: AuditCategory): string[] {
  return Object.entries(PREFIX_CATEGORY).filter(([, c]) => !category || c === category).map(([p]) => `${p}.%`);
}

export function actionsOfCategory(category: AuditCategory): string[] {
  return Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.category === category).map(([k]) => k);
}

/** Known actions whose text (either language) contains the term: lets the search box find "moved a task" by what the person reads. */
export function actionsMatchingText(term: string): string[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.ar.includes(needle) || v.en.toLowerCase().includes(needle)).map(([k]) => k);
}
