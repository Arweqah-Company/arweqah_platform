import type { InviteResultDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui';

export type InvitationState = InviteResultDto;

/** Result of sending the activation e-mail. Outside production the link is shown so it can be tried without e-mail. */
export function InvitationNotice({ invitation }: { invitation: InvitationState }) {
  const { t } = useTranslation('employees');
  return (
    <div className="mb-4 flex flex-col gap-2">
      <Alert tone={invitation.sent ? 'success' : 'warning'}>{invitation.sent ? t('invitation.sent', { email: invitation.sentTo }) : t('invitation.failed')}</Alert>
      {invitation.enrollmentUrl && (
        <p className="text-xs text-muted">
          {t('invitation.devLink')} <a dir="ltr" className="break-all text-petrol-800 underline" href={invitation.enrollmentUrl}>{invitation.enrollmentUrl}</a>
        </p>
      )}
    </div>
  );
}
