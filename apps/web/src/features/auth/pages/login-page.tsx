import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/core/api/api-client';
import { authClient } from '@/core/auth/auth-client';
import { Alert, Button, CodeInput, FormField, Input } from '@/shared/ui';
import { identifyEmail, signInWithCode } from '../api';
import { AuthShell } from './auth-shell';

type Step = 'email' | 'code';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstTime, setFirstTime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = (location.state as { from?: string } | null)?.from ?? '/';

  const microsoft = async () => {
    setError(null);
    const result = await authClient.signIn.social({ provider: 'microsoft', callbackURL: window.location.origin + target });
    if (result.error) setError(t('microsoftFailed'));
  };

  const next = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !email) return;
    setBusy(true);
    setError(null);
    try {
      setFirstTime((await identifyEmail(email)).firstTime);
      setStep('code');
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 429 ? t('tooMany') : t('failed'));
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
      await signInWithCode({ email, code: finalCode });
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
          <FormField label={t('email')}>
            {(p) => <Input {...p} type="email" autoComplete="username" dir="ltr" placeholder="name@arweqah.sa" value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </FormField>
          <Button type="submit" disabled={busy || !email}>{t('next')}</Button>
        </form>
      ) : (
        <CodeStep email={email} firstTime={firstTime} error={error} code={code} busy={busy} onCode={setCode} onSubmit={(e, full) => void submit(e, full)} onBack={back} />
      )}
    </AuthShell>
  );
}

interface CodeStepProps {
  email: string;
  firstTime: boolean;
  error: string | null;
  code: string;
  busy: boolean;
  onCode: (code: string) => void;
  onSubmit: (event?: FormEvent, code?: string) => void;
  onBack: () => void;
}

function CodeStep({ email, firstTime, error, code, busy, onCode, onSubmit, onBack }: CodeStepProps) {
  const { t } = useTranslation('auth');
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => onSubmit(e)} noValidate>
      <p dir="ltr" className="text-sm font-medium">{email}</p>
      {firstTime && <Alert tone="info">{t('firstTimeSent')}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-fg" id="code-label">{t('code')}</span>
        <CodeInput label={t('code')} value={code} onChange={onCode} onComplete={(full) => onSubmit(undefined, full)} invalid={!!error} disabled={busy} />
        <p className="text-xs text-muted">{t('codeHint')}</p>
      </div>
      <Button type="submit" disabled={busy || code.length < 6}>{t('submit')}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>{t('changeEmail')}</Button>
    </form>
  );
}
