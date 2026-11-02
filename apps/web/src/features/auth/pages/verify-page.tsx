import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/core/api/api-client';
import { ME_KEY, useMe, useSignOut } from '@/core/auth/session';
import { Alert, Button, CodeInput, FormField, Input } from '@/shared/ui';
import { skipCodeOnTrustedDevice, verifyCode } from '../api';
import { AuthShell } from './auth-shell';

/** Entering the code: state and submit in one place, so the page itself only draws. */
function useCodeStep() {
  const { t } = useTranslation('auth');
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event?: FormEvent, finalCode: string = code) => {
    event?.preventDefault();
    if (busy || !finalCode) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(finalCode, remember);
      await client.invalidateQueries({ queryKey: ME_KEY });
    } catch (failure) {
      setError(failure instanceof ApiError && failure.code === 'AUTHENTICATOR_LOCKED' ? t('verify.locked') : t('verify.invalid'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return { code, setCode, remember, setRemember, error, setError, busy, submit };
}

/** The form of the code step (app code, or a backup code). */
function VerifyForm({ trusting }: { trusting: boolean }) {
  const { t } = useTranslation('auth');
  const signOut = useSignOut();
  const step = useCodeStep();
  const [useBackup, setUseBackup] = useState(false);
  const toggle = () => {
    setUseBackup(!useBackup);
    step.setCode('');
    step.setError(null);
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void step.submit(e)} noValidate>
      {step.error && <Alert>{step.error}</Alert>}
      {trusting && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-petrol-800" checked={step.remember} onChange={(e) => step.setRemember(e.target.checked)} />
          {t('verify.remember')}
        </label>
      )}
      {useBackup ? (
        <FormField label={t('verify.backupLabel')}>
          {(p) => <Input {...p} dir="ltr" autoComplete="off" placeholder="XXXXX-XXXXX" value={step.code} onChange={(e) => step.setCode(e.target.value)} />}
        </FormField>
      ) : (
        <CodeInput label={t('code')} value={step.code} onChange={step.setCode} onComplete={(full) => void step.submit(undefined, full)} invalid={!!step.error} disabled={step.busy} autoFocus />
      )}
      <Button type="submit" disabled={step.busy || step.code.length < 6}>{t('verify.submit')}</Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-link underline underline-offset-4" onClick={toggle}>{useBackup ? t('verify.useApp') : t('verify.useBackup')}</button>
        <button type="button" className="text-muted underline underline-offset-4" onClick={() => void signOut()}>{t('verify.signOut')}</button>
      </div>
    </form>
  );
}

/** The code step: every sign-in, also after Microsoft, ends here until the code of the app is entered. */
export function VerifyPage() {
  const { t } = useTranslation('auth');
  const me = useMe();
  const navigate = useNavigate();
  const target = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const verified = me.data?.mfaVerified;

  const client = useQueryClient();
  const trusting = !!me.data?.trustedDevicesEnabled;
  const tried = useRef(false);

  useEffect(() => {
    if (verified) navigate(target, { replace: true });
  }, [verified, navigate, target]);

  // On a browser the person trusted, the server skips this step by itself.
  useEffect(() => {
    if (!trusting || verified || tried.current || !me.data?.authenticatorEnabled) return;
    tried.current = true;
    void skipCodeOnTrustedDevice()
      .then(async (r) => {
        if (r.skipped) await client.invalidateQueries({ queryKey: ME_KEY });
      })
      .catch(() => undefined);
  }, [trusting, verified, me.data?.authenticatorEnabled, client]);

  if (me.isError) return <Navigate to="/login" replace />;
  if (me.data && !me.data.authenticatorEnabled) return <Navigate to="/enroll" replace />;
  return (
    <AuthShell title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <VerifyForm trusting={trusting} />
    </AuthShell>
  );
}
