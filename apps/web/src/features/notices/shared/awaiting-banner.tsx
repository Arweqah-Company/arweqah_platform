import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Button } from '@/shared/ui';
import { useNoticeHome } from '../api';

/** A bar under the header while a policy waits for my acknowledgement: it says so and goes to «My notices» (it is not drawn on that page itself). */
export function AwaitingNoticesBanner() {
  const { t } = useTranslation('notices');
  const allowed = usePermissions().can(CorePermission.NoticesView);
  const awaiting = useNoticeHome(allowed).data?.awaiting ?? 0;
  const onNotices = useLocation().pathname.startsWith('/notices');
  if (!awaiting || onNotices) return null;
  return (
    <section aria-label={t('banner.label')}>
      <Alert tone="warning">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span><b>{t('banner.title')}</b> {t('banner.body', { count: awaiting })}</span>
          <Button asChild size="sm"><Link to="/notices">{t('banner.go')}</Link></Button>
        </div>
      </Alert>
    </section>
  );
}
