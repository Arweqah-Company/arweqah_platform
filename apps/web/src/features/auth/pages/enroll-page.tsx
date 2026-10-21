import { useQueryClient } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toDataURL } from 'qrcode';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import type { BackupCodesDto, EnrollmentStartDto } from '@arweqah-platform/shared';
import { ApiError } from '@/core/api/api-client';
import { ME_KEY, useMe } from '@/core/auth/session';
import { Alert, Button, CodeInput } from '@/shared/ui';
import { confirmEnrollment, confirmInviteEnrollment, inviteEnrollment, startEnrollment } from '../api';
import { AuthShell } from './auth-shell';

interface FlowProps {
  queryKey: string[];
  start: () => Promise<EnrollmentStartDto>;
  confirm: (code: string) => Promise<BackupCodesDto>;
  onDone: () => void | Promise<void>;
  doneLabelKey: 'continueSignIn' | 'continueApp';
}

/** Scan the QR code once, confirm the first code, keep the backup codes. Shared by the e-mailed link and the signed-in path. */
function EnrollmentFlow({ queryKey, start, confirm, onDone, doneLabelKey }: FlowProps) {
  const { t } = useTranslation('auth');
  const [code, setCode] = useState('');
  const setup = useQuery({ queryKey, queryFn: start, staleTime: Infinity, gcTime: 0, retry: false });
  const qr = useQuery({ queryKey: [...queryKey, 'qr'], enabled: !!setup.data, staleTime: Infinity, queryFn: () => toDataURL((setup.data as EnrollmentStartDto).otpauthUri, { margin: 1, width: 224 }) });
  const confirmed = useMutation({ mutationFn: confirm });

  if (setup.isError) return <Alert>{setup.error instanceof ApiError && setup.error.status === 404 ? t('enroll.linkInvalid') : t('enroll.failed')}</Alert>;
  if (confirmed.data) return <BackupCodes codes={confirmed.data.backupCodes} onDone={onDone} doneLabelKey={doneLabelKey} />;
  if (!setup.data) return <p role="status" className="text-sm text-muted">{t('enroll.loading')}</p>;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) confirmed.mutate(code);
      }}
    >
      <ol className="flex list-decimal flex-col gap-3 ps-5 text-sm">
        <li>{t('enroll.step1')}</li>
        <li>
          {t('enroll.step2')}
          <div className="mt-3 flex flex-col items-center gap-2">
            {qr.data && <img src={qr.data} alt={t('enroll.qrAlt')} width={224} height={224} className="rounded-[var(--radius-control)] border border-neutral-200" />}
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">{t('enroll.manual')}</summary>
              <code dir="ltr" className="mt-1 block select-all break-all rounded bg-neutral-50 px-2 py-1 text-ink">{setup.data.secret}</code>
            </details>
          </div>
        </li>
        <li>{t('enroll.step3')}</li>
      </ol>
      {confirmed.isError && <Alert>{t('enroll.invalid')}</Alert>}
      <CodeInput label={t('code')} value={code} onChange={setCode} invalid={confirmed.isError} disabled={confirmed.isPending} onComplete={(full) => confirmed.mutate(full)} />
      <Button type="submit" disabled={confirmed.isPending || code.length < 6}>{t('enroll.confirm')}</Button>
    </form>
  );
}

function BackupCodes({ codes, onDone, doneLabelKey }: { codes: string[]; onDone: FlowProps['onDone']; doneLabelKey: FlowProps['doneLabelKey'] }) {
  const { t } = useTranslation('auth');
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'arweqah-backup-codes.txt' });
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="success">{t('enroll.done')}</Alert>
      <div>
        <h2 className="text-lg font-bold">{t('enroll.backupTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('enroll.backupHint')}</p>
      </div>
      <ul dir="ltr" className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] bg-neutral-50 p-3 font-medium">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copy()}>{copied ? t('enroll.copied') : t('enroll.copy')}</Button>
        <Button variant="secondary" size="sm" onClick={download}>{t('enroll.download')}</Button>
      </div>
      <Button onClick={() => void onDone()}>{t(`enroll.${doneLabelKey}`)}</Button>
    </div>
  );
}

/** From the link in the invitation e-mail: no session yet. */
export function InviteEnrollPage() {
  const { t } = useTranslation('auth');
  const { token = '' } = useParams();
  const navigate = useNavigate();
  return (
    <AuthShell title={t('enroll.title')} subtitle={t('enroll.subtitle')}>
      <EnrollmentFlow
        queryKey={['enroll', 'invite', token]}
        start={() => inviteEnrollment(token)}
        confirm={(code) => confirmInviteEnrollment(token, code)}
        onDone={() => navigate('/login', { replace: true })}
        doneLabelKey="continueSignIn"
      />
    </AuthShell>
  );
}

/** Someone who signed in with Microsoft and has no app linked yet. */
export function SessionEnrollPage() {
  const { t } = useTranslation('auth');
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  if (me.isError) return <Navigate to="/login" replace />;
  if (me.data?.authenticatorEnabled && me.data.mfaVerified) return <Navigate to="/" replace />;
  return (
    <AuthShell title={t('enroll.title')} subtitle={t('enroll.subtitle')}>
      {me.data && (
        <EnrollmentFlow
          queryKey={['enroll', 'session']}
          start={startEnrollment}
          confirm={confirmEnrollment}
          onDone={async () => {
            await client.invalidateQueries({ queryKey: ME_KEY });
            navigate('/', { replace: true });
          }}
          doneLabelKey="continueApp"
        />
      )}
    </AuthShell>
  );
}
