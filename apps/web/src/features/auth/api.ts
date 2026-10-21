import type { BackupCodesDto, EnrollmentStartDto } from '@arweqah-platform/shared';
import { apiClient } from '@/core/api/api-client';

/** E-mail + code of the authenticator app. A 401 always means "e-mail or code is not valid". */
export const signInWithCode = (input: { email: string; code: string }) => apiClient.post<{ user: { id: string } }>('/auth/totp/sign-in', input);

/** The code step for a session that is not code-verified yet (after Microsoft sign-in). */
export const verifyCode = (code: string) => apiClient.post<void>('/mfa/verify', { code });

export const inviteEnrollment = (token: string) => apiClient.get<EnrollmentStartDto>(`/mfa/enrollment/${token}`);
export const confirmInviteEnrollment = (token: string, code: string) => apiClient.post<BackupCodesDto>(`/mfa/enrollment/${token}/confirm`, { code });

export const startEnrollment = () => apiClient.post<EnrollmentStartDto>('/mfa/enroll');
export const confirmEnrollment = (code: string) => apiClient.post<BackupCodesDto>('/mfa/enroll/confirm', { code });

/** Sign-in step 1: says whether this is a first sign-in (the server then e-mails the QR link). */
export const identifyEmail = (email: string) => apiClient.post<{ firstTime: boolean }>('/mfa/identify', { email });
