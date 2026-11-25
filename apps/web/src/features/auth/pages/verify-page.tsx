import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/core/api/api-client';
import { ME_KEY, useMe, useSignOut } from '@/core/auth/session';
import { Alert, Button, CodeInput, FormField, Input } from '@/shared/ui';
import { sendEmailCodeToMe, skipCodeOnTrustedDevice, verifyCode } from '../api';
import { EmailCodeOption, useEmailCode, type EmailCodeState } from './email-code-option';
import { AuthShell } from './auth-shell';

/** Entering the code: state and submit in one place, so the page itself only draws. */
function useCodeStep(method: 'app' | 'email', trusting: boolean, code: string, setCode: (code: string) => void) {
  const { t } = useTranslation('auth');
  const client = useQueryClient();
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event?: FormEvent, finalCode: string = code) => {
    event?.preventDefault();
    if (busy || !finalCode) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(finalCode, trusting && remember, method);
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

/** Someone who has not linked an app yet chooses: link it, or have a code e-mailed (the code boxes appear once it is asked for). */
function FirstTimeChoice({ emailCode, disabled }: { emailCode: EmailCodeState; disabled: boolean }) {
  const { t } = useTranslation('auth');
  const signOut = useSignOut();
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('verify.firstTime')}</Alert>
      <Button asChild><Link to="/enroll">{t('verify.linkApp')}</Link></Button>
      <EmailCodeOption state={emailCode} disabled={disabled} />
      <button type="button" className="cursor-pointer self-start text-sm text-muted underline underline-offset-4" onClick={() => void signOut()}>{t('verify.signOut')}</button>
    </div>
  );
}

/** The boxes of the code step: the e-mailed code, the app's, or a backup code; nothing while the e-mailed code is being sent. */
function CodeField({ step, method, sending, useBackup }: { step: ReturnType<typeof useCodeStep>; method: 'app' | 'email'; sending: boolean; useBackup: boolean }) {
  const { t } = useTranslation('auth');
  if (sending && method === 'app') return null;
  if (useBackup && method === 'app') {
    return (
      <FormField label={t('verify.backupLabel')}>
        {(p) => <Input {...p} dir="ltr" autoComplete="off" placeholder="XXXXX-XXXXX" value={step.code} onChange={(e) => step.setCode(e.target.value)} />}
      </FormField>
    );
  }
  return <CodeInput label={method === 'email' ? t('emailCode.label') : t('code')} value={step.code} onChange={step.setCode} onComplete={(full) => void step.submit(undefined, full)} invalid={!!step.error} disabled={step.busy} autoFocus />;
}

/** The form of the code step (app code, a backup code, or the e-mailed code). */
function CodeForm({ trusting, emailCode, code, setCode }: { trusting: boolean; emailCode: EmailCodeState; code: string; setCode: (code: string) => void }) {
  const { t } = useTranslation('auth');
  const signOut = useSignOut();
  const step = useCodeStep(emailCode.method, trusting, code, setCode);
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
      <CodeField step={step} method={emailCode.method} sending={emailCode.sending} useBackup={useBackup} />
      <Button type="submit" disabled={step.busy || step.code.length < 6}>{t('verify.submit')}</Button>
      <EmailCodeOption state={emailCode} disabled={step.busy} />
      <div className="flex items-center justify-between text-sm">
        {emailCode.method === 'app' ? <button type="button" className="cursor-pointer text-link underline underline-offset-4" onClick={toggle}>{useBackup ? t('verify.useApp') : t('verify.useBackup')}</button> : <span />}
        <button type="button" className="text-muted underline underline-offset-4" onClick={() => void signOut()}>{t('verify.signOut')}</button>
      </div>
    </form>
  );
}

/** The code step: the code form, or, for someone with no app linked yet, the choice between linking it and the e-mailed code. */
function VerifyForm({ trusting, enrolled, autoSend }: { trusting: boolean; enrolled: boolean; autoSend: boolean }) {
  const [code, setCode] = useState('');
  const emailCode = useEmailCode(sendEmailCodeToMe, () => setCode(''));
  const sent = useRef(false);
  // The code goes to the mailbox by itself, once, as soon as a trusted browser has had its chance to skip the step; the app is the second choice.
  useEffect(() => {
    if (!enrolled || !autoSend || sent.current) return;
    sent.current = true;
    void emailCode.request();
  }, [enrolled, autoSend, emailCode]);
  if (!enrolled && emailCode.method === 'app') return <FirstTimeChoice emailCode={emailCode} disabled={false} />;
  return <CodeForm trusting={trusting} emailCode={emailCode} code={code} setCode={setCode} />;
}

/** On a browser the person trusted, the server skips this step by itself; answers `true` once it has said it did not (or could not), so the code may be e-mailed. */
function useTrustedSkip(attempt: boolean) {
  const client = useQueryClient();
  const tried = useRef(false);
  const [declined, setDeclined] = useState(false);
  useEffect(() => {
    if (!attempt || tried.current) return;
    tried.current = true;
    skipCodeOnTrustedDevice()
      .then((r) => (r.skipped ? client.invalidateQueries({ queryKey: ME_KEY }) : setDeclined(true)))
      .catch(() => setDeclined(true));
  }, [attempt, client]);
  return declined;
}

/** What the page needs to know about the session: whether the step is already done, whether browsers may be trusted, and whether the code may be e-mailed now. */
function useVerifyGate() {
  const me = useMe();
  const verified = !!me.data?.mfaVerified;
  const trusting = !!me.data?.trustedDevicesEnabled;
  const mayTrySkip = trusting && !!me.data?.authenticatorEnabled;
  const declined = useTrustedSkip(mayTrySkip && !verified);
  return { me, verified, trusting, autoSend: !verified && (!mayTrySkip || declined) };
}

/** The code step: every sign-in, also after Microsoft, ends here until the code is entered (the e-mailed one first, the app's as the second choice). */
export function VerifyPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const target = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const { me, verified, trusting, autoSend } = useVerifyGate();

  useEffect(() => {
    if (verified) navigate(target, { replace: true });
  }, [verified, navigate, target]);

  if (me.isError) return <Navigate to="/login" replace />;
  if (!me.data) return null;
  return (
    <AuthShell title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <VerifyForm trusting={trusting} enrolled={me.data.authenticatorEnabled} autoSend={autoSend} />
    </AuthShell>
  );
}
