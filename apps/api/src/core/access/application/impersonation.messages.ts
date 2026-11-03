/** Audit action names of «sign in as». */
export const IMPERSONATION_AUDIT = {
  started: 'impersonation.started',
  ended: 'impersonation.ended',
} as const;

export type ImpersonationEndReason = 'manual' | 'idle' | 'disabled';

/** The notice the employee gets after a platform administrator worked as them. */
export function impersonationEndedNotice(adminName: string, startedAt: Date, minutes: number): { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string } {
  const at = (locale: string): string => startedAt.toLocaleString(locale, { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' });
  return {
    titleAr: 'دخل مدير النظام بحسابك',
    titleEn: 'A platform administrator worked in your account',
    bodyAr: `دخل ${adminName} بحسابك في ${at('ar-SA')} لمدة ${minutes} دقيقة.`,
    bodyEn: `${adminName} worked in your account at ${at('en-GB')} for ${minutes} minute(s).`,
  };
}
