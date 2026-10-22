import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/core/api/api-client';
import { ME_KEY, useMe, useSignOut } from '@/core/auth/session';
import { Alert, Button, CodeInput, FormField, Input } from '@/shared/ui';
import { verifyCode } from '../api';
import { AuthShell } from './auth-shell';

/** Entering the code: state and submit in one place, so the page itself only draws. */
function useCodeStep() {
  const { t } = useTranslation('auth');
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event?: FormEvent, finalCode: string = code) => {
    event?.preventDefault();
    if (busy || !finalCode) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(finalCode);
      await client.invalidateQueries({ queryKey: ME_KEY });
    } catch (failure) {
      setError(failure instanceof ApiError && failure.code === 'AUTHENTICATOR_LOCKED' ? t('verify.locked') : t('verify.invalid'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return { code, setCode, error, setError, busy, submit };
}

/** The form of the code step (app code, or a backup code). */
function VerifyForm() {
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

  useEffect(() => {
    if (verified) navigate(target, { replace: true });
  }, [verified, navigate, target]);

  if (me.isError) return <Navigate to="/login" replace />;
  if (me.data && !me.data.authenticatorEnabled) return <Navigate to="/enroll" replace />;
  return (
    <AuthShell title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <VerifyForm />
    </AuthShell>
  );
}
