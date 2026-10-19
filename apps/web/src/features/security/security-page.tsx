import { useQueryClient } from '@tanstack/react-query';
import { toDataURL } from 'qrcode';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { authClient } from '@/core/auth/auth-client';
import { ME_KEY, useMe } from '@/core/auth/session';
import { Alert, Button, FormField, Input, PageHeader } from '@/shared/ui';

interface Enrollment {
  qr: string;
  backupCodes: string[];
}

export function SecurityPage() {
  const { t } = useTranslation('security');
  const me = useMe();
  const [params] = useSearchParams();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const enabled = me.data?.twoFactorEnabled;

  return (
    <section className="max-w-2xl">
      <PageHeader title={t('title')} description={t('description')} />
      {params.get('required') && !enabled && <Alert tone="warning">{t('required')}</Alert>}
      <div className="mt-6 rounded-[var(--radius-panel)] border border-line bg-white p-6">
        {enabled ? (
          <Alert tone="success">{t('enabled')}</Alert>
        ) : enrollment ? (
          <VerifyStep enrollment={enrollment} />
        ) : (
          <PasswordStep onEnrolled={setEnrollment} />
        )}
      </div>
    </section>
  );
}

function PasswordStep({ onEnrolled }: { onEnrolled: (e: Enrollment) => void }) {
  const { t } = useTranslation('security');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await authClient.twoFactor.enable({ password });
    if (res.error || res.data?.method !== 'totp') return setError(t('wrongPassword'));
    onEnrolled({ qr: await toDataURL(res.data.totpURI, { margin: 1, width: 200 }), backupCodes: res.data.backupCodes });
  };
  return (
    <form className="flex max-w-sm flex-col gap-4" onSubmit={submit}>
      <h2 className="font-bold">{t('step1')}</h2>
      {error && <Alert>{error}</Alert>}
      <FormField label={t('password')}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />}
      </FormField>
      <Button type="submit" disabled={!password}>
        {t('start')}
      </Button>
    </form>
  );
}

function VerifyStep({ enrollment }: { enrollment: Enrollment }) {
  const { t } = useTranslation('security');
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await authClient.twoFactor.verifyTotp({ code });
    if (res.error) return setError(t('wrongCode'));
    await client.invalidateQueries({ queryKey: ME_KEY });
  };
  return (
    <form className="grid gap-6 sm:grid-cols-[200px_1fr]" onSubmit={submit}>
      <img src={enrollment.qr} alt={t('qrAlt')} width={200} height={200} className="rounded border border-line" />
      <div className="flex flex-col gap-4">
        <h2 className="font-bold">{t('step2')}</h2>
        {error && <Alert>{error}</Alert>}
        <FormField label={t('code')}>
          {(p) => <Input {...p} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} dir="ltr" />}
        </FormField>
        <Button type="submit" disabled={code.length !== 6}>
          {t('finish')}
        </Button>
        <p className="text-sm text-muted">{t('backupCodes')}</p>
        <ul className="grid grid-cols-2 gap-1 font-latin text-sm" dir="ltr">
          {enrollment.backupCodes.map((c) => (
            <li key={c} className="rounded bg-navy-50 px-2 py-1 text-center">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
