/**
 * The audit log keeps technical names (`roleIds`, `jobTitleId`) and ids. A person reads the Arabic or English label of each key and the
 * name behind each id: the API turns every entry into `details` with this dictionary, and the web only shows them.
 */
export interface AuditText {
  ar: string;
  en: string;
}

export interface AuditDetailDto {
  label: AuditText;
  value: AuditText;
}

const t = (ar: string, en: string): AuditText => ({ ar, en });

/** The details of an employee that the audit log names when they change (the log never keeps their values). */
const EMPLOYEE_FIELD_LABELS: Record<string, AuditText> = {
  fullNameEn: t('الاسم بالإنجليزية', 'Name in English'),
  fullName: t('الاسم', 'Name'),
  gender: t('الجنس', 'Gender'),
  birthDate: t('تاريخ الميلاد', 'Date of birth'),
  nationalityId: t('الجنسية', 'Nationality'),
  maritalStatusId: t('الحالة الاجتماعية', 'Marital status'),
  residencyStatusId: t('حالة الإقامة', 'Residency status'),
  workPhone: t('هاتف العمل', 'Work phone'),
  personalPhone: t('الجوال الشخصي', 'Personal phone'),
  personalEmail: t('البريد الشخصي', 'Personal e-mail'),
  workEmail: t('بريد العمل', 'Work e-mail'),
  workLocation: t('موقع العمل', 'Work location'),
  workCountryId: t('دولة العمل', 'Work country'),
  workMode: t('نمط العمل', 'Work mode'),
  profession: t('المهنة', 'Profession'),
  idTypeId: t('نوع الهوية', 'ID type'),
  idNumber: t('رقم الهوية', 'ID number'),
  idExpiryDate: t('تاريخ انتهاء الهوية', 'ID expiry date'),
  contractTypeId: t('نوع العقد', 'Contract type'),
  contractTypeOther: t('نوع العقد (آخر)', 'Contract type (other)'),
  contractCompanyId: t('شركة العقد', 'Contract company'),
  isGosiRegistered: t('التسجيل في التأمينات', 'Registered in GOSI'),
  gosiCompanyId: t('شركة التأمينات', 'GOSI company'),
  gosiRegistrationDate: t('تاريخ التسجيل في التأمينات', 'GOSI registration date'),
  gosiSystemId: t('نظام التأمينات', 'GOSI system'),
  isQiwaContract: t('العقد موثق في قوى', 'Contract documented in Qiwa'),
  hasMedicalInsurance: t('التأمين الطبي', 'Medical insurance'),
  healthInsuranceCompanyId: t('شركة التأمين الطبي', 'Health insurance company'),
  monthlyGrossSalary: t('الراتب الشهري الإجمالي', 'Monthly gross salary'),
  salaryCurrencyCountryId: t('عملة الراتب', 'Salary currency'),
  iban: t('الآيبان', 'IBAN'),
  notes: t('ملاحظات', 'Notes'),
  companyId: t('الشركة', 'Company'),
  orgNodeId: t('الوحدة', 'Unit'),
  jobTitleId: t('المسمى الوظيفي', 'Job title'),
  managerId: t('المدير المباشر', 'Direct manager'),
  relationTypeId: t('نوع العلاقة', 'Relation type'),
  startDate: t('تاريخ المباشرة', 'Start date'),
  endDate: t('تاريخ الانتهاء', 'End date'),
  terminationReasonId: t('سبب إنهاء العلاقة', 'Termination reason'),
  terminationReasonOther: t('سبب الإنهاء (آخر)', 'Termination reason (other)'),
  employeeNumber: t('الرقم الوظيفي', 'Employee number'),
};

/** The other keys the platform writes into the log. */
const KEY_LABELS: Record<string, AuditText> = {
  ...EMPLOYEE_FIELD_LABELS,
  fields: t('البيانات التي تغيّرت', 'Details that changed'),
  roleIds: t('الأدوار', 'Roles'),
  roles: t('عدد الأدوار', 'Number of roles'),
  withEndDate: t('أدوار لها تاريخ انتهاء', 'Roles with an end date'),
  groupIds: t('مجموعات الأدوار', 'Role groups'),
  employeeId: t('الموظف', 'Employee'),
  unitId: t('الوحدة', 'Unit'),
  deskId: t('الجهة المستقبلة', 'Receiving department'),
  typeId: t('نوع التذكرة', 'Ticket type'),
  priority: t('الأولوية', 'Priority'),
  isPersonal: t('تذكرة شخصية', 'Personal ticket'),
  from: t('من', 'From'),
  to: t('إلى', 'To'),
  validFrom: t('يسري من', 'Effective from'),
  effectiveFrom: t('يسري من', 'Effective from'),
  reason: t('السبب', 'Reason'),
  applied: t('طُبّق فورًا', 'Applied at once'),
  status: t('الحالة', 'Status'),
  count: t('العدد', 'Count'),
  kind: t('النوع', 'Kind'),
  level: t('المستوى', 'Level'),
  cost: t('التكلفة', 'Cost'),
  version: t('الإصدار', 'Version'),
  people: t('عدد الأشخاص', 'Number of people'),
  impersonatedBy: t('نُفّذ بالدخول بدلًا من شخص بواسطة', 'Done while signed in as someone by'),
};

/** Splits `someKeyName` into «some key name» when the dictionary has no label for it. */
const humanize = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_.]+/g, ' ').toLowerCase();

export const auditKeyLabel = (key: string): AuditText => KEY_LABELS[key] ?? t(humanize(key), humanize(key));
