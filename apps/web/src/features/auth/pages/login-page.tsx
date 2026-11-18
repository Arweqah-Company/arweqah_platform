import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/core/api/api-client';
import { authClient } from '@/core/auth/auth-client';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, CodeInput, FormField, Input, Turnstile } from '@/shared/ui';
import { identifyEmail, sendEmailCode, signInWithCode, trustedSignIn, useCaptchaConfig } from '../api';
import { EmailCodeOption, useEmailCode, type EmailCodeState } from './email-code-option';
import { AuthShell } from './auth-shell';

type Step = 'email' | 'code';

/** The bot check of the e-mail step: shown only while an administrator has one switched on; the button waits for its answer, and each request needs a fresh one. */
function useBotCheck() {
  const siteKey = useCaptchaConfig().data?.siteKey ?? null;
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  return { siteKey, token, setToken, round, ready: !siteKey || !!token, refresh: () => setRound((r) => r + 1) };
}

function useMicrosoft(target: string, setError: (message: string | null) => void) {
  const { t } = useTranslation('auth');
  return async () => {
    setError(null);
    const result = await authClient.signIn.social({ provider: 'microsoft', callbackURL: window.location.origin + target });
    if (result.error) setError(t('microsoftFailed'));
  };
}

/** On a browser the person trusted, the e-mail alone signs in; any failure just means the code is asked. */
function useTrustedEntry(target: string) {
  const navigate = useNavigate();
  const client = useQueryClient();
  return async (email: string): Promise<boolean> => {
    try {
      await trustedSignIn(email);
    } catch {
      return false;
    }
    await client.invalidateQueries();
    navigate(target, { replace: true });
    return true;
  };
}

function identifyFailure(failure: unknown, t: (key: string) => string): string {
  if (!(failure instanceof ApiError)) return t('failed');
  if (failure.status === 429) return t('tooMany');
  return failure.code === 'CAPTCHA_FAILED' ? t('botCheckFailed') : t('failed');
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const target = (location.state as { from?: string } | null)?.from ?? '/';
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [identified, setIdentified] = useState({ firstTime: false, trustedDevicesEnabled: false });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enterWithTrustedDevice = useTrustedEntry(target);
  const bot = useBotCheck();
  const emailCode = useEmailCode(() => sendEmailCode(email), () => setCode(''));
  const emailLive = useLiveError(email, useRules().email);

  const microsoft = useMicrosoft(target, setError);

  const next = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !email || !bot.ready) return;
    setBusy(true);
    setError(null);
    try {
      const found = await identifyEmail(email, bot.token ?? undefined);
      setIdentified(found);
      if (!found.firstTime && found.trustedDevicesEnabled && (await enterWithTrustedDevice(email))) return;
      setStep('code');
    } catch (failure) {
      setError(identifyFailure(failure, t));
      bot.refresh();
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event?: FormEvent, finalCode: string = code) => {
    event?.preventDefault();
    if (busy || finalCode.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithCode({ email, code: finalCode, ...(remember ? { rememberDevice: true } : {}), ...(emailCode.method === 'email' ? { method: 'email' as const } : {}) });
      await client.invalidateQueries();
      navigate(target, { replace: true });
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 429 ? t('tooMany') : t('invalid'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setStep('email');
    setCode('');
    setError(null);
    emailCode.useApp();
  };

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      {step === 'email' && (
        <>
          <Button variant="secondary" className="w-full" onClick={() => void microsoft()}>{t('microsoft')}</Button>
          <p className="my-5 text-center text-xs text-muted">{t('or')}</p>
        </>
      )}
      {step === 'email' ? (
        <form className="flex flex-col gap-4" onSubmit={(e) => void next(e)} noValidate>
          {error && <Alert>{error}</Alert>}
          <FormField label={t('email')} error={emailLive.error}>
            {(p) => <Input {...p} type="email" autoComplete="username" dir="ltr" placeholder="name@arweqah.sa" onBlur={emailLive.onBlur} value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </FormField>
          {bot.siteKey && <Turnstile siteKey={bot.siteKey} onToken={bot.setToken} resetKey={bot.round} />}
          <Button type="submit" disabled={busy || !email || !bot.ready}>{t('next')}</Button>
        </form>
      ) : (
        <CodeStep email={email} firstTime={identified.firstTime} emailCode={emailCode} remember={identified.trustedDevicesEnabled ? { checked: remember, onChange: setRemember } : null} error={error} code={code} busy={busy} onCode={setCode} onSubmit={(e, full) => void submit(e, full)} onBack={back} />
      )}
    </AuthShell>
  );
}

interface CodeStepProps {
  email: string;
  firstTime: boolean;
  emailCode: EmailCodeState;
  remember: { checked: boolean; onChange: (value: boolean) => void } | null;
  error: string | null;
  code: string;
  busy: boolean;
  onCode: (code: string) => void;
  onSubmit: (event?: FormEvent, code?: string) => void;
  onBack: () => void;
}

function CodeStep({ email, firstTime, emailCode, remember, error, code, busy, onCode, onSubmit, onBack }: CodeStepProps) {
  const { t } = useTranslation('auth');
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => onSubmit(e)} noValidate>
      <p dir="ltr" className="text-sm font-medium">{email}</p>
      {firstTime && <Alert tone="info">{t('firstTimeSent')}</Alert>}
      {error && <Alert>{error}</Alert>}
      {remember && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-petrol-800" checked={remember.checked} onChange={(e) => remember.onChange(e.target.checked)} />
          {t('verify.remember')}
        </label>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-fg" id="code-label">{emailCode.method === 'email' ? t('emailCode.label') : t('code')}</span>
        <CodeInput label={emailCode.method === 'email' ? t('emailCode.label') : t('code')} value={code} onChange={onCode} onComplete={(full) => onSubmit(undefined, full)} invalid={!!error} disabled={busy} />
        {emailCode.method === 'app' && <p className="text-xs text-muted">{t('codeHint')}</p>}
        {!firstTime && <EmailCodeOption state={emailCode} disabled={busy} />}
      </div>
      <Button type="submit" disabled={busy || code.length < 6}>{t('submit')}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>{t('changeEmail')}</Button>
    </form>
  );
}
